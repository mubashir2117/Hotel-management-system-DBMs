const { getConnection, sql } = require('../config/db');

// 1. GET ALL GUESTS
async function getAllGuests(req, res) {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT g.GuestId, u.UserId, u.Name, u.Email, u.Phone, u.Country,
             g.LoyaltyPoints, g.CreatedAt,
             (SELECT COUNT(*) FROM Bookings b WHERE b.GuestId = g.GuestId) AS TotalBookings
      FROM Guests g
      JOIN Users u ON g.UserId = u.UserId
      ORDER BY g.CreatedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// 2. GET GUEST BY ID
async function getGuestById(req, res) {
  try {
    const pool = await getConnection();

    const guestRes = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT g.GuestId, u.UserId, u.Name, u.Email, u.Phone, u.Country, g.LoyaltyPoints, g.CreatedAt
              FROM Guests g JOIN Users u ON g.UserId = u.UserId WHERE g.GuestId = @id`);
    if (!guestRes.recordset[0]) return res.status(404).json({ message: 'Guest not found' });

    const bookingsRes = await pool.request()
      .input('guestId', sql.Int, req.params.id)
      .query(`SELECT b.*, r.RoomNumber, r.RoomType FROM Bookings b
              JOIN Rooms r ON b.RoomId = r.RoomId
              WHERE b.GuestId = @guestId ORDER BY b.CreatedAt DESC`);

    res.json({ ...guestRes.recordset[0], bookings: bookingsRes.recordset });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// 3. 🆕 UPDATE GUEST PROFILE (Admin Action)
async function updateGuestProfile(req, res) {
  const { userId } = req.params;
  const { name, phone, country } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const pool = await getConnection();
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('name', sql.VarChar, name.trim())
      .input('phone', sql.VarChar, phone || null)
      .input('country', sql.VarChar, country || null)
      .query(`
        UPDATE Users 
        SET Name = @name, Phone = @phone, Country = @country 
        WHERE UserId = @userId
      `);

    res.json({ message: 'Guest profile updated successfully' });
  } catch (err) {
    console.error('Update guest error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
}

// 4. 🆕 DELETE GUEST USER & ALL RELATED DATA (Safelink with Transaction)
async function deleteGuestUser(req, res) {
  const { userId } = req.params;
  const pool = await getConnection();
  
  // SQL Transaction shuru karenge taaki safe cascading ho sake
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // A. Pehle GuestId dhoondein is UserId ke agaisnt
    const guestData = await transaction.request()
      .input('userId', sql.Int, userId)
      .query('SELECT GuestId FROM Guests WHERE UserId = @userId');

    if (guestData.recordset.length > 0) {
      const guestId = guestData.recordset[0].GuestId;

      // B. Pehle Bookings table se is guest ke saare records udaayein (FOREIGN KEY CRASH SE BACHNE KE LIYE)
      await transaction.request()
        .input('guestId', sql.Int, guestId)
        .query('DELETE FROM Bookings WHERE GuestId = @guestId');

      // C. Phir Guests table se row udaayein
      await transaction.request()
        .input('guestId', sql.Int, guestId)
        .query('DELETE FROM Guests WHERE GuestId = @guestId');
    }

    // D. Aakhir mein Users main table se record delete karein
    await transaction.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM Users WHERE UserId = @userId');

    // Agar sab sahi chala toh saari tabdeeliyan save (Commit) kar dein
    await transaction.commit();
    res.json({ message: 'Guest and all related booking history deleted successfully!' });

  } catch (err) {
    // Agar koi bhi galti ho toh poori query wapas roll-back kar dein taaki data corrupt na ho
    await transaction.rollback();
    console.error('Delete guest transaction error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
}

module.exports = { 
  getAllGuests, 
  getGuestById, 
  updateGuestProfile, 
  deleteGuestUser 
};

