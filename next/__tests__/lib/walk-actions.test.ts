import { searchInternalAction } from '../../app/lib/walk-actions';
import { jest } from '@jest/globals';

// Mock the dependencies
jest.mock('../../lib/db/models', () => {
  return {
    findAndCountAll: jest.fn(),
    decodePath: jest.fn(),
    getPathExtent: jest.fn(),
    getStartPoint: jest.fn(),
    getEndPoint: jest.fn(),
  };
});

jest.mock('sequelize', () => {
  return {
    where: jest.fn(),
    fn: jest.fn(),
    col: jest.fn(),
    literal: jest.fn(),
  };
});

// Mock Map for props
class MockMap {
  private data = new Map<string, any>();
  
  get(key: string): any {
    return this.data.get(key);
  }
  
  set(key: string, value: any): void {
    this.data.set(key, value);
  }
  
  has(key: string): boolean {
    return this.data.has(key);
  }
}

describe('searchInternalAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should handle date filter properly', async () => {
    const sequelize = require('sequelize');
    const Walk = require('../../models/walk');
    
    // Mock the findAndCountAll response
    Walk.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        asObject: jest.fn().mockReturnValue({ id: 1, title: 'Test Walk' })
      }]
    });
    
    // Create a props instance using the Map-like interface
    const props = new MockMap();
    props.set('date', '2023-05-15');
    props.set('limit', '20');
    props.set('offset', '0');
    
    const result = await searchInternalAction(props, 'testUserId');
    
    // Verify the result
    expect(result.count).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ id: 1, title: 'Test Walk' });
    
    // Verify the query used the correct date filter
    expect(Walk.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Symbol.for('and')]: expect.arrayContaining([
            { date: '2023-05-15' },
            { draft: false }
          ])
        })
      })
    );
  });
  
  it('should handle user filter properly', async () => {
    const sequelize = require('sequelize');
    const Walk = require('../../models/walk');
    
    // Mock the findAndCountAll response
    Walk.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        { asObject: jest.fn().mockReturnValue({ id: 1, title: 'Walk 1', uid: 'user123' }) },
        { asObject: jest.fn().mockReturnValue({ id: 2, title: 'Walk 2', uid: 'user123' }) }
      ]
    });
    
    // Create a props instance using the Map-like interface
    const props = new MockMap();
    props.set('user', 'user123');
    props.set('limit', '20');
    props.set('offset', '0');
    
    const result = await searchInternalAction(props, 'testUserId');
    
    // Verify the result
    expect(result.count).toBe(2);
    expect(result.rows).toHaveLength(2);
    
    // Verify the query used the correct user filter
    expect(Walk.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Symbol.for('and')]: expect.arrayContaining([
            { uid: 'user123' },
            { draft: false }
          ])
        })
      })
    );
  });
  
  it('should handle year and month filters properly', async () => {
    const sequelize = require('sequelize');
    const Walk = require('../../models/walk');
    
    sequelize.fn.mockImplementation((fn, ...args) => ({ fn, args }));
    sequelize.col.mockImplementation((col) => ({ col }));
    sequelize.where.mockImplementation((col, val) => ({ col, val }));
    
    // Mock the findAndCountAll response
    Walk.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{ asObject: jest.fn().mockReturnValue({ id: 1, title: 'January Walk' }) }]
    });
    
    // Create a props instance using the Map-like interface
    const props = new MockMap();
    props.set('year', '2023');
    props.set('month', '1');
    props.set('limit', '20');
    props.set('offset', '0');
    
    const result = await searchInternalAction(props, 'testUserId');
    
    // Verify the result
    expect(result.count).toBe(1);
    
    // Verify the sequelize functions were called with correct arguments
    expect(sequelize.fn).toHaveBeenCalledWith('date_part', 'year', expect.anything());
    expect(sequelize.fn).toHaveBeenCalledWith('date_part', 'month', expect.anything());
    expect(sequelize.col).toHaveBeenCalledWith('date');
  });
  
  // Add more tests for different filter combinations
});