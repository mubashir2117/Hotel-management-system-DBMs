// POST: Send/Save a contact message
router.post('/contact/send', async (req, res) => {
  try {
    // Frontend se data receive karein
    const { UserId, GuestName, GuestEmail, Subject, Message } = req.body;

    // Validation
    if (!GuestName || !GuestEmail || !Subject || !Message) {
      return res.status(400).json({ message: 'All fields (Name, Email, Subject, Message) are required.' });
    }

    // SQL Server SQL Query (mssql package ke mutabik)
    const pool = await db.connect(); // Aapka database connection pool
    await pool.request()
      .input('UserId', db.Int, UserId || null) // Agar user login nahi hai to NULL jayega
      .input('GuestName', db.NVarChar(100), GuestName)
      .input('GuestEmail', db.VarChar(150), GuestEmail)
      .input('Subject', db.NVarChar(200), Subject)
      .input('Message', db.NVarChar(db.MAX), Message)
      .query(`
        INSERT INTO ContactMessages (UserId, GuestName, GuestEmail, Subject, Message, Status)
        VALUES (@UserId, @GuestName, @GuestEmail, @Subject, @Message, 'Unread')
      `);

    res.status(201).json({ success: true, message: 'Message sent successfully! We will get back to you soon.' });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
});