const { getConnection, sql } = require('../config/db');

async function getAllPricing(req, res) {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM SeasonalPricing ORDER BY StartDate DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getEffectivePrice(req, res) {
  const { date, roomType } = req.query;
  try {
    const pool = await getConnection();
    const req2 = pool.request().input('date', sql.Date, date || new Date());
    let query = `SELECT TOP 1 PriceMultiplier FROM SeasonalPricing
                 WHERE @date BETWEEN StartDate AND EndDate`;
    if (roomType) {
      req2.input('roomType', sql.VarChar, roomType);
      query += ' AND (RoomType IS NULL OR RoomType = @roomType)';
    }
    query += ' ORDER BY PricingId DESC';
    const result = await req2.query(query);
    res.json({ multiplier: result.recordset[0] ? parseFloat(result.recordset[0].PriceMultiplier) : 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function createPricing(req, res) {
  const { SeasonName, StartDate, EndDate, RoomType, PriceMultiplier } = req.body;
  if (!SeasonName || !StartDate || !EndDate || !PriceMultiplier) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('name', sql.VarChar, SeasonName)
      .input('start', sql.Date, StartDate)
      .input('end', sql.Date, EndDate)
      .input('type', sql.VarChar, RoomType || null)
      .input('mult', sql.Decimal(5,2), PriceMultiplier)
      .query(`INSERT INTO SeasonalPricing (SeasonName, StartDate, EndDate, RoomType, PriceMultiplier, CreatedAt)
              OUTPUT INSERTED.* VALUES (@name, @start, @end, @type, @mult, GETDATE())`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function updatePricing(req, res) {
  const { SeasonName, StartDate, EndDate, RoomType, PriceMultiplier } = req.body;
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.VarChar, SeasonName)
      .input('start', sql.Date, StartDate)
      .input('end', sql.Date, EndDate)
      .input('type', sql.VarChar, RoomType || null)
      .input('mult', sql.Decimal(5,2), PriceMultiplier)
      .query(`UPDATE SeasonalPricing SET SeasonName=@name, StartDate=@start, EndDate=@end,
              RoomType=@type, PriceMultiplier=@mult WHERE PricingId=@id`);
    res.json({ message: 'Pricing rule updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deletePricing(req, res) {
  try {
    const pool = await getConnection();
    await pool.request().input('id', sql.Int, req.params.id)
      .query('DELETE FROM SeasonalPricing WHERE PricingId = @id');
    res.json({ message: 'Pricing rule deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getAllPricing, getEffectivePrice, createPricing, updatePricing, deletePricing };
