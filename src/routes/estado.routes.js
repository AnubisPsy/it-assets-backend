const express = require("express");
const router = express.Router();
const { pool, poolConnect, sql } = require("../config/database");

router.get("/", async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query("SELECT * FROM estado ORDER BY id");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;