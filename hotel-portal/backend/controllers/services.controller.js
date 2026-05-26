const { getConnection, sql } = require('../config/db');

async function getMenu(req, res) {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT * FROM ServiceMenuItems ORDER BY Category, ItemName');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function createMenuItem(req, res) {
  const { ItemName, Category, Price, IsAvailable } = req.body;
  if (!ItemName || !Category || !Price) return res.status(400).json({ message: 'ItemName, Category and Price required' });
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('name', sql.VarChar, ItemName)
      .input('cat', sql.VarChar, Category)
      .input('price', sql.Decimal(10,2), Price)
      .input('avail', sql.Bit, IsAvailable !== undefined ? IsAvailable : 1)
      .query(`INSERT INTO ServiceMenuItems (ItemName, Category, Price, IsAvailable, CreatedAt)
              OUTPUT INSERTED.* VALUES (@name, @cat, @price, @avail, GETDATE())`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateMenuItem(req, res) {
  const { ItemName, Category, Price, IsAvailable } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.VarChar, ItemName)
      .input('cat', sql.VarChar, Category)
      .input('price', sql.Decimal(10,2), Price)
      .input('avail', sql.Bit, IsAvailable !== undefined ? IsAvailable : 1)
      .query(`UPDATE ServiceMenuItems SET ItemName=@name, Category=@cat, Price=@price, IsAvailable=@avail
              WHERE ItemId=@id`);
    res.json({ message: 'Item updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteMenuItem(req, res) {
  try {
    const pool = await getConnection();
    await pool.request().input('id', sql.Int, req.params.id)
      .query('DELETE FROM ServiceMenuItems WHERE ItemId = @id');
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getAllRequests(req, res) {
  try {
    const pool = await getConnection();
    let query, request = pool.request();

    if (req.user.role === 'admin') {
      query = `SELECT sr.*, smi.ItemName, u.Name AS GuestName, r.RoomNumber
               FROM ServiceRequests sr
               JOIN ServiceMenuItems smi ON sr.ItemId = smi.ItemId
               JOIN Guests g ON sr.GuestId = g.GuestId
               JOIN Users u ON g.UserId = u.UserId
               JOIN Bookings b ON sr.BookingId = b.BookingId
               JOIN Rooms r ON b.RoomId = r.RoomId
               ORDER BY sr.RequestedAt DESC`;
    } else {
      request.input('guestId', sql.Int, req.user.guestId);
      query = `SELECT sr.*, smi.ItemName
               FROM ServiceRequests sr
               JOIN ServiceMenuItems smi ON sr.ItemId = smi.ItemId
               WHERE sr.GuestId = @guestId
               ORDER BY sr.RequestedAt DESC`;
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function createRequest(req, res) {
  const { BookingId, ItemId, Quantity, Notes } = req.body;
  if (!BookingId || !ItemId || !Quantity) return res.status(400).json({ message: 'BookingId, ItemId and Quantity required' });

  try {
    const pool = await getConnection();
    const guestId = req.user.guestId;

    // Verify the booking belongs to this guest and is Checked-In
    const bookRes = await pool.request()
      .input('bookingId', sql.Int, BookingId)
      .input('guestId', sql.Int, guestId)
      .query(`SELECT * FROM Bookings WHERE BookingId = @bookingId AND GuestId = @guestId AND Status = 'Checked-In'`);

    if (!bookRes.recordset[0]) {
      return res.status(400).json({ message: 'No active Checked-In booking found' });
    }

    const result = await pool.request()
      .input('bookingId', sql.Int, BookingId)
      .input('guestId', sql.Int, guestId)
      .input('itemId', sql.Int, ItemId)
      .input('qty', sql.Int, Quantity)
      .input('notes', sql.NVarChar, Notes || null)
      .query(`INSERT INTO ServiceRequests (BookingId, GuestId, ItemId, Quantity, Notes, Status, RequestedAt)
              OUTPUT INSERTED.*
              VALUES (@bookingId, @guestId, @itemId, @qty, @notes, 'Pending', GETDATE())`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updateRequestStatus(req, res) {
  const { Status } = req.body;
  const valid = ['Pending', 'In Progress', 'Completed'];
  if (!valid.includes(Status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar, Status)
      .query('UPDATE ServiceRequests SET Status = @status WHERE RequestId = @id');
    res.json({ message: 'Request updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getMenu, createMenuItem, updateMenuItem, deleteMenuItem, getAllRequests, createRequest, updateRequestStatus };
