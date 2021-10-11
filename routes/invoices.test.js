// connect to right DB --- set before loading db.js

process.env.NODE_ENV = 'test';

//NPM Packages
const request = require('supertest');

//App Imports
const app = require('../app');
const db = require('../db');

let testCompany;
let testInvoice;
const date = new Date();

beforeEach(async () => {
  const companyResult = await db.query(
    `INSERT INTO companies (code, name, description) VALUES ('aa', 'test_name', 'test_description') RETURNING code, name, description`
  );
  testCompany = companyResult.rows[0];
  const invoiceResult = await db.query(
    `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, comp_code, amt, paid, add_date, paid_date`,
    ['aa', 100, false, date, null]
  );
  testInvoice = invoiceResult.rows[0];
});

afterEach(async () => {
  const queries = [
    db.query(`DELETE FROM companies`),
    db.query(`DELETE from invoices`),
  ];
  await Promise.all(queries);
});

afterAll(async () => {
  // close DB connection
  await db.end();
});

describe('GET /invoices', () => {
  test('Get a list with one company', async () => {
    const res = await request(app).get('/invoices');
    expect(res.statusCode).toBe(200);
    const { amt, comp_code, paid, paid_date } = testInvoice;
    expect(res.body).toEqual({
      invoices: [
        {
          add_date: expect.any(String),
          amt,
          comp_code,
          id: testInvoice.id,
          paid,
          paid_date,
        },
      ],
    });
  });
});

describe('GET /invoices/:id', () => {
  test('Gets a single invoice', async () => {
    const res = await request(app).get(`/invoices/${testInvoice.id}`);
    expect(res.statusCode).toBe(200);
    const { amt, paid, paid_date } = testInvoice;
    expect(res.body).toEqual({
      invoice: {
        id: `${testInvoice.id}`,
        amt,
        paid,
        add_date: expect.any(String),
        paid_date,
        company: testCompany,
      },
    });
  });
  test('Results in a 404 for Invalid ID', async () => {
    const res = await request(app).get(`/invoices/0`);
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /invoices', () => {
  test('Creates an invoice', async () => {
    const newInvoice = { comp_code: 'aa', amt: 100 };
    const res = await request(app).post('/invoices').send(newInvoice);
    expect(res.statusCode).toBe(201);
    const { comp_code, amt } = newInvoice;
    expect(res.body).toEqual({
      invoice: {
        id: expect.any(Number),
        comp_code,
        amt,
        paid: false,
        add_date: expect.any(String),
        paid_date: null,
      },
    });
  });
  test('Returns a 422 for an invalid post request', async () => {
    const badInvoice = {
      comp_code: 'bb',
    };
    const res = await request(app).post('/companies').send(badInvoice);
    expect(res.statusCode).toBe(422);
  });
});

describe('PUT /invoices/:id', () => {
  test('Updates a single Invoice', async () => {
    const res = await request(app)
      .put(`/invoices/${testInvoice.id}`)
      .send({ amt: 600, paid: true });
    expect(res.statusCode).toBe(200);
    const { comp_code, paid, paid_date } = testInvoice;
    expect(res.body).toEqual({
      invoice: {
        id: expect.any(Number),
        comp_code,
        amt: 600,
        paid: true,
        add_date: expect.any(String),
        paid_date: expect.any(String),
      },
    });
  });
  test('Returns a 422 for invalid request', async () => {
    const res = await request(app)
      .put(`/invoices/${testInvoice.id}`)
      .send({ amt: 600 });
    expect(res.statusCode).toBe(422);
  });
  test('Returns a 404 for invalid id', async () => {
    const res = await request(app)
      .put(`/invoices/0`)
      .send({ amt: 600, paid: false });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /invoices/:id', () => {
  test('Deletes a single invoice', async () => {
    const res = await request(app).delete(`/invoices/${testInvoice.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'deleted' });
  });
  test('Returns a 404 for invalid code', async () => {
    const res = await request(app).delete(`/invoices/0`);
    expect(res.statusCode).toBe(404);
  });
});
