const { getConnection, sql } = require('../config/db');

const VALID_STATUSES = ['Available', 'Occupied', 'Under Maintenance', 'Reserved'];
const VALID_TYPES = ['Single', 'Double', 'Suite', 'Deluxe'];

async function getAllRooms(req, res) {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Rooms ORDER BY RoomNumber');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getRoomStatus(req, res) {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT RoomId, RoomNumber, RoomType, Status FROM Rooms ORDER BY RoomNumber');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getAvailableRooms(req, res) {
  const { checkin, checkout, type, maxprice } = req.query;
  if (!checkin || !checkout) return res.status(400).json({ message: 'checkin and checkout dates required' });

  try {
    const pool = await getConnection();
    let query = `
      SELECT r.*,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM SeasonalPricing sp
            WHERE (sp.RoomType IS NULL OR sp.RoomType = r.RoomType)
            AND CAST(GETDATE() AS DATE) BETWEEN sp.StartDate AND sp.EndDate
          )
          THEN r.BasePricePerNight * (
            SELECT TOP 1 PriceMultiplier FROM SeasonalPricing sp2
            WHERE (sp2.RoomType IS NULL OR sp2.RoomType = r.RoomType)
            AND CAST(GETDATE() AS DATE) BETWEEN sp2.StartDate AND sp2.EndDate
            ORDER BY sp2.PricingId DESC
          )
          ELSE r.BasePricePerNight
        END AS EffectivePrice
      FROM Rooms r
      WHERE r.Status = 'Available'
      AND r.RoomId NOT IN (
        SELECT b.RoomId FROM Bookings b
        WHERE b.Status NOT IN ('Cancelled','Checked-Out')
        AND b.CheckInDate < @checkout
        AND b.CheckOutDate > @checkin
      )`;

    const req2 = pool.request()
      .input('checkin', sql.Date, checkin)
      .input('checkout', sql.Date, checkout);

    if (type) {
      query += ' AND r.RoomType = @type';
      req2.input('type', sql.VarChar, type);
    }
    if (maxprice) {
      query += ' AND r.BasePricePerNight <= @maxprice';
      req2.input('maxprice', sql.Decimal(10,2), parseFloat(maxprice));
    }

    query += ' ORDER BY r.BasePricePerNight ASC';
    const result = await req2.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getRoomById(req, res) {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Rooms WHERE RoomId = @id');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Room not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function createRoom(req, res) {
  const { RoomNumber, RoomType, Floor, Capacity, BasePricePerNight, Description, Amenities } = req.body;
  if (!RoomNumber || !RoomType || !Floor || !Capacity || !BasePricePerNight) {
    return res.status(400).json({ message: 'Required fields missing' });
  }
  if (!VALID_TYPES.includes(RoomType)) return res.status(400).json({ message: 'Invalid room type' });

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('roomNumber', sql.VarChar, RoomNumber)
      .input('roomType', sql.VarChar, RoomType)
      .input('floor', sql.Int, Floor)
      .input('capacity', sql.Int, Capacity)
      .input('price', sql.Decimal(10,2), BasePricePerNight)
      .input('desc', sql.NVarChar, Description || null)
      .input('amenities', sql.VarChar, Amenities || null)
      .query(`INSERT INTO Rooms (RoomNumber, RoomType, Floor, Capacity, BasePricePerNight, Description, Amenities, Status, CreatedAt)
              OUTPUT INSERTED.*
              VALUES (@roomNumber, @roomType, @floor, @capacity, @price, @desc, @amenities, 'Available', GETDATE())`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate')) {
      return res.status(400).json({ message: 'Room number already exists' });
    }
    res.status(500).json({ message: err.message });
  }
}

async function updateRoom(req, res) {
  const { RoomNumber, RoomType, Floor, Capacity, BasePricePerNight, Description, Amenities } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('roomNumber', sql.VarChar, RoomNumber)
      .input('roomType', sql.VarChar, RoomType)
      .input('floor', sql.Int, Floor)
      .input('capacity', sql.Int, Capacity)
      .input('price', sql.Decimal(10,2), BasePricePerNight)
      .input('desc', sql.NVarChar, Description || null)
      .input('amenities', sql.VarChar, Amenities || null)
      .query(`UPDATE Rooms SET RoomNumber=@roomNumber, RoomType=@roomType, Floor=@floor,
              Capacity=@capacity, BasePricePerNight=@price, Description=@desc, Amenities=@amenities
              WHERE RoomId=@id`);
    res.json({ message: 'Room updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateRoomStatus(req, res) {
  const { Status } = req.body;
  if (!VALID_STATUSES.includes(Status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar, Status)
      .query('UPDATE Rooms SET Status = @status WHERE RoomId = @id');
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteRoom(req, res) {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Rooms WHERE RoomId = @id');
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getAllRooms, getRoomStatus, getAvailableRooms, getRoomById, createRoom, updateRoom, updateRoomStatus, deleteRoom };
