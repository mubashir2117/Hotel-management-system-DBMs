const { getConnection, sql } = require('../config/db');

async function getAllBookings(req, res) {
  try {
    const pool = await getConnection();
    let query;
    let request = pool.request();

    if (req.user.role === 'admin') {
      query = `
        SELECT b.*, u.Name AS GuestName, u.Email AS GuestEmail,
               r.RoomNumber, r.RoomType
        FROM Bookings b
        JOIN Guests g ON b.GuestId = g.GuestId
        JOIN Users u ON g.UserId = u.UserId
        JOIN Rooms r ON b.RoomId = r.RoomId
        ORDER BY b.CreatedAt DESC`;
    } else {
      // Guest sees only their own
      request.input('guestId', sql.Int, req.user.guestId);
      query = `
        SELECT b.*, r.RoomNumber, r.RoomType
        FROM Bookings b
        JOIN Rooms r ON b.RoomId = r.RoomId
        WHERE b.GuestId = @guestId
        ORDER BY b.CreatedAt DESC`;
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getBookingStats(req, res) {
  try {
    const pool = await getConnection();
    const today = new Date().toISOString().split('T')[0];

    const statsRes = await pool.request()
      .input('today', sql.Date, today)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM Bookings WHERE CAST(CheckInDate AS DATE) = @today AND Status = 'Confirmed') AS todayCheckins,
          (SELECT COUNT(*) FROM Bookings WHERE CAST(CheckOutDate AS DATE) = @today AND Status = 'Checked-In') AS todayCheckouts,
          (SELECT ISNULL(SUM(TotalPrice),0) FROM Bookings
           WHERE MONTH(CreatedAt) = MONTH(GETDATE()) AND YEAR(CreatedAt) = YEAR(GETDATE())
           AND Status NOT IN ('Cancelled')) AS monthlyRevenue
      `);
    res.json(statsRes.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getBookingById(req, res) {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT b.*, r.RoomNumber, r.RoomType, u.Name AS GuestName
              FROM Bookings b
              JOIN Rooms r ON b.RoomId = r.RoomId
              JOIN Guests g ON b.GuestId = g.GuestId
              JOIN Users u ON g.UserId = u.UserId
              WHERE b.BookingId = @id`);
    if (!result.recordset[0]) return res.status(404).json({ message: 'Booking not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function createBooking(req, res) {
  const { RoomId, CheckInDate, CheckOutDate } = req.body;
  if (!RoomId || !CheckInDate || !CheckOutDate) return res.status(400).json({ message: 'RoomId, CheckInDate and CheckOutDate required' });

  const checkin = new Date(CheckInDate);
  const checkout = new Date(CheckOutDate);
  if (checkout <= checkin) return res.status(400).json({ message: 'Check-out must be after check-in' });
  const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));

  try {
    const pool = await getConnection();

    // Check room exists and is available
    const roomRes = await pool.request()
      .input('roomId', sql.Int, RoomId)
      .query('SELECT * FROM Rooms WHERE RoomId = @roomId');
    const room = roomRes.recordset[0];
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.Status !== 'Available') return res.status(400).json({ message: 'Room is not available' });

    // Check no conflicting bookings
    const conflictRes = await pool.request()
      .input('roomId', sql.Int, RoomId)
      .input('checkin', sql.Date, CheckInDate)
      .input('checkout', sql.Date, CheckOutDate)
      .query(`SELECT COUNT(*) AS cnt FROM Bookings
              WHERE RoomId = @roomId
              AND Status NOT IN ('Cancelled','Checked-Out')
              AND CheckInDate < @checkout AND CheckOutDate > @checkin`);
    if (conflictRes.recordset[0].cnt > 0) return res.status(400).json({ message: 'Room already booked for those dates' });

    // Get effective price (apply seasonal pricing if any)
    const pricingRes = await pool.request()
      .input('today', sql.Date, new Date().toISOString().split('T')[0])
      .input('roomType', sql.VarChar, room.RoomType)
      .query(`SELECT TOP 1 PriceMultiplier FROM SeasonalPricing
              WHERE (RoomType IS NULL OR RoomType = @roomType)
              AND @today BETWEEN StartDate AND EndDate
              ORDER BY PricingId DESC`);
    const multiplier = pricingRes.recordset[0] ? parseFloat(pricingRes.recordset[0].PriceMultiplier) : 1;
    const pricePerNight = parseFloat(room.BasePricePerNight) * multiplier;
    const totalPrice = pricePerNight * nights;

    // Get guestId
    const guestId = req.user.guestId;
    if (!guestId) return res.status(400).json({ message: 'Guest profile not found' });

    // Create booking
    const bookRes = await pool.request()
      .input('guestId', sql.Int, guestId)
      .input('roomId', sql.Int, RoomId)
      .input('checkin', sql.Date, CheckInDate)
      .input('checkout', sql.Date, CheckOutDate)
      .input('nights', sql.Int, nights)
      .input('total', sql.Decimal(10,2), totalPrice)
      .query(`INSERT INTO Bookings (GuestId, RoomId, CheckInDate, CheckOutDate, Nights, TotalPrice, Status, CreatedAt)
              OUTPUT INSERTED.*
              VALUES (@guestId, @roomId, @checkin, @checkout, @nights, @total, 'Pending', GETDATE())`);

    // Update room to Reserved
    await pool.request()
      .input('roomId', sql.Int, RoomId)
      .query("UPDATE Rooms SET Status = 'Reserved' WHERE RoomId = @roomId");

    res.status(201).json(bookRes.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateBookingStatus(req, res) {
  const { Status } = req.body;
  const validStatuses = ['Pending','Confirmed','Checked-In','Checked-Out','Cancelled'];
  if (!validStatuses.includes(Status)) return res.status(400).json({ message: 'Invalid status' });

  try {
    const pool = await getConnection();

    // Get booking to find roomId
    const bookRes = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Bookings WHERE BookingId = @id');
    const booking = bookRes.recordset[0];
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Update booking status
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar, Status)
      .query('UPDATE Bookings SET Status = @status WHERE BookingId = @id');

    // Update room status based on booking status change
    let roomStatus = null;
    if (Status === 'Checked-In') roomStatus = 'Occupied';
    else if (Status === 'Checked-Out') roomStatus = 'Available';
    else if (Status === 'Cancelled') roomStatus = 'Available';
    else if (Status === 'Confirmed') roomStatus = 'Reserved';

    if (roomStatus) {
      await pool.request()
        .input('roomId', sql.Int, booking.RoomId)
        .input('roomStatus', sql.VarChar, roomStatus)
        .query('UPDATE Rooms SET Status = @roomStatus WHERE RoomId = @roomId');
    }

    res.json({ message: 'Booking status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function cancelBooking(req, res) {
  try {
    const pool = await getConnection();
    const guestId = req.user.guestId;

    const bookRes = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Bookings WHERE BookingId = @id');
    const booking = bookRes.recordset[0];
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Guests can only cancel their own bookings
    if (req.user.role === 'guest' && booking.GuestId !== guestId) {
      return res.status(403).json({ message: 'Not your booking' });
    }

    if (!['Pending','Confirmed'].includes(booking.Status)) {
      return res.status(400).json({ message: 'Only Pending or Confirmed bookings can be cancelled' });
    }

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query("UPDATE Bookings SET Status = 'Cancelled' WHERE BookingId = @id");

    await pool.request()
      .input('roomId', sql.Int, booking.RoomId)
      .query("UPDATE Rooms SET Status = 'Available' WHERE RoomId = @roomId");

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getAllBookings, getBookingStats, getBookingById, createBooking, updateBookingStatus, cancelBooking };
