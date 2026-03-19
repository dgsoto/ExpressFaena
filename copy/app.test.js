
import { addToCart } from './app.js';
const fs = require('fs');
const path = require('path');

describe('addToCart', () => {
  it('should add an item to the cart', () => {
    addToCart('test', 10);
    expect(carrito.length).toBe(1);
  });
});

describe('404.html', () => {
  it('should exist', () => {
    const filePath = path.join(__dirname, '404.html');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should have the correct title', () => {
    const filePath = path.join(__dirname, '404.html');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    expect(fileContent).toContain('<title>Page Not Found</title>');
  });
});
