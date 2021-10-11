// Routes for Biztime Invoices

const express = require('express');
const ExpressError = require('../expressError');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const results = await db.query(
      `SELECT id, comp_code, amt, paid, add_date, paid_date FROM invoices`
    );
    return res.json({ invoices: results.rows });
  } catch (e) {
    return next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const results = await db.query(
      `SELECT id, comp_code, amt, paid, add_date, paid_date FROM invoices WHERE id=$1`,
      [id]
    );
    if (!results.rows[0]) {
      throw new ExpressError(`Cannot find invoice under id of ${id}`, 404);
    }
    const { comp_code, amt, paid, add_date, paid_date } = results.rows[0];
    const company = await db.query(
      `SELECT code, name, description FROM companies WHERE code=$1`,
      [comp_code]
    );
    return res.json({
      invoice: {
        id,
        amt,
        paid,
        add_date,
        paid_date,
        company: company.rows[0],
      },
    });
  } catch (e) {
    return next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { comp_code, amt } = req.body;
    const add_date = new Date();
    if (!comp_code || !amt) {
      throw new ExpressError('Invalid Request', 422);
    }
    const results = await db.query(
      'INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, comp_code, amt, paid, add_date, paid_date',
      [comp_code, amt, false, add_date, null]
    );
    return res.status(201).json({ invoice: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amt, paid } = req.body;
    if (!amt || (paid !== true && paid !== false)) {
      throw new ExpressError('Invalid Request', 422);
    }
    let paid_date;
    if (paid) {
      paid_date = new Date();
    } else {
      paid_date = null;
    }
    const results = await db.query(
      'UPDATE invoices SET amt=$1, paid=$2, paid_date=$3 WHERE id=$4 RETURNING id, comp_code, amt, paid, add_date, paid_date',
      [amt, paid, paid_date, id]
    );
    if (!results.rows[0]) {
      throw new ExpressError(`Invalid ${id}`, 404);
    }
    return res.json({ invoice: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ExpressError('Invalid Request', 422);
    }
    const results = await db.query('DELETE FROM invoices WHERE id=$1', [id]);
    if (results.rowCount === 0) throw new ExpressError('Invalid Id', 404);
    return res.send({ status: 'deleted' });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
