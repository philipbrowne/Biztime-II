// Routes for Biztime Industries

const express = require('express');
const ExpressError = require('../expressError');
const router = express.Router();
const db = require('../db');
const slugify = require('slugify');

router.get('/', async (req, res, next) => {
  try {
    const industryResults = await db.query(
      `SELECT code, industry FROM industries`
    );
    const industries = industryResults.rows;
    industries.forEach(async (industry) => {
      const indCode = industry.code;
      const industryRes = await db.query(
        `SELECT industries.code AS industry_code, industry, company_code FROM industries LEFT JOIN companies_industries AS ci ON industries.code = ci.industry_code 
LEFT JOIN companies ON ci.company_code = companies.code WHERE industry_code=$1`,
        [indCode]
      );
      const company_codes = industryRes.rows.map((row) => row.company_code);
      industry.company_codes = company_codes;
    });
    await db.query(
      `SELECT industries.code AS industry_code, industry, company_code FROM industries LEFT JOIN companies_industries AS ci ON industries.code = ci.industry_code
    LEFT JOIN companies ON ci.company_code = companies.code`
    );
    return res.json(industries);
  } catch (e) {
    return next(e);
  }
});
router.post('/', async (req, res, next) => {
  try {
    const { industry } = req.body;
    if (!industry) {
      throw new ExpressError('Request must have Code and Industry Name', 422);
    }
    const code = slugify(industry, { lower: true, remove: /[*+~.()'"!:@]/g });
    const results = await db.query(
      'INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING code, industry',
      [code, industry]
    );
    return res.status(201).json({ industry: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.post('/:code', async (req, res, next) => {
  try {
    const { company_code } = req.body;
    if (!company_code) {
      throw new ExpressError('Request must have Company Code', 422);
    }
    const industryResult = await db.query(
      `SELECT code, industry FROM industries WHERE code=$1`,
      [req.params.code]
    );
    if (industryResult.rows.length === 0) {
      throw new ExpressError(
        `Cannot find Industry under code of ${req.params.code}`,
        404
      );
    }
    const industry = industryResult.rows[0];
    await db.query(`INSERT INTO companies_industries VALUES ($1, $2)`, [
      company_code,
      req.params.code,
    ]);
    const industryRes2 = await db.query(
      `SELECT industries.code AS industry_code, industry, company_code FROM industries LEFT JOIN companies_industries AS ci ON industries.code = ci.industry_code 
LEFT JOIN companies ON ci.company_code = companies.code WHERE industry_code=$1`,
      [req.params.code]
    );
    const company_codes = industryRes2.rows.map((row) => row.company_code);
    industry.company_codes = company_codes;
    return res.status(201).json({ industry: industry });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
