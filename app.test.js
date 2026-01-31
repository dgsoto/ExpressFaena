
import { addToCart } from './app.js';

describe('addToCart', () => {
  it('should add an item to the cart', () => {
    addToCart('test', 10);
    expect(carrito.length).toBe(1);
  });
});
