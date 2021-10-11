// connect to right DB --- set before loading db.js

process.env.NODE_ENV = 'test';

//NPM Packages
const request = require('supertest');

//App Imports
const app = require('../app');
const db = require('../db');

let testCompany;
let testIndustries;
const date = new Date();

beforeEach(async () => {
  const companyResult = await db.query(
    `INSERT INTO companies (code, name, description) VALUES ('aa', 'test_name', 'test_description') RETURNING code, name, description`
  );
  const industryResult = await db.query(
    `INSERT INTO industries VALUES ('acct', 'Accounting')`
  );
  await db.query(`INSERT INTO companies_industries VALUES ('aa', 'acct')`);
  testIndustries = industryResult.rows;
  testCompany = companyResult.rows[0];
  testCompany.industries = testIndustries;
});

afterEach(async () => {
  const queries = [
    db.query(`DELETE FROM companies`),
    db.query(`DELETE from industries`),
    db.query(`DELETE FROM companies_industries`),
  ];
  await Promise.all(queries);
});

afterAll(async () => {
  // close DB connection
  await db.end();
});

describe('GET /companies', () => {
  test('Get a list with one company', async () => {
    const res = await request(app).get('/companies');
    expect(res.statusCode).toBe(200);
    const { code, name, description } = testCompany;
    expect(res.body).toEqual({
      companies: [{ code, name, description }],
    });
  });
});

describe('GET /companies/:code', () => {
  test('Gets a single company', async () => {
    const res = await request(app).get(`/companies/${testCompany.code}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      company: {
        ...testCompany,
        industries: ['Accounting'],
        invoices: [],
      },
    });
  });
  test('Results in a 404 for Invalid Code', async () => {
    const res = await request(app).get(`/companies/badcode`);
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /companies', () => {
  test('Creates a single company', async () => {
    const newCompany = {
      name: 'testCompany2',
      description: 'testDescription2',
    };
    const res = await request(app).post('/companies').send(newCompany);
    expect(res.statusCode).toBe(201);
    const { name, description } = newCompany;
    expect(res.body).toEqual({
      company: { code: 'testcompany2', name, description },
    });
  });
  test('Returns a 422 for an invalid post request', async () => {
    const badCompany = {
      name: 'testCompany2',
    };
    const res = await request(app).post('/companies').send(badCompany);
    expect(res.statusCode).toBe(422);
  });
});

describe('PUT /companies/:code', () => {
  test('Updates a single company', async () => {
    const res = await request(app)
      .put(`/companies/${testCompany.code}`)
      .send({ name: 'New Name', description: 'New Description' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      company: {
        code: testCompany.code,
        name: 'New Name',
        description: 'New Description',
      },
    });
  });
  test('Returns a 404 for invalid code', async () => {
    const res = await request(app).patch(`/companies/badcode`);
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /companies/:code', () => {
  test('Deletes a single company', async () => {
    const res = await request(app).delete(`/companies/${testCompany.code}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'deleted' });
  });
  test('Returns a 404 for invalid code', async () => {
    const res = await request(app).delete(`/companies/badcode`);
    expect(res.statusCode).toBe(404);
  });
});
