import { supabase } from './client';
import { Database } from '@/integrations/supabase/types';

// Enable debug mode for detailed logging
const DEBUG = true;

// Schema version - increment when database schema changes
const SCHEMA_VERSION = 1;

// Get the current schema version from localStorage
export const getStoredSchemaVersion = (): number => {
  try {
    const version = localStorage.getItem('mizuchi_schema_version');
    return version ? parseInt(version, 10) : 0;
  } catch (error) {
    console.error('[SchemaValidator] Error getting stored schema version:', error);
    return 0;
  }
};

// Set the current schema version in localStorage
export const setStoredSchemaVersion = (version: number): void => {
  try {
    localStorage.setItem('mizuchi_schema_version', version.toString());
  } catch (error) {
    console.error('[SchemaValidator] Error storing schema version:', error);
  }
};

/**
 * Required tables with their required fields
 * This provides a minimal validation to ensure critical tables exist
 */
export const REQUIRED_TABLES = {
  'watchlists': ['id', 'name', 'created_by', 'is_public', 'created_at', 'updated_at'],
  'watchlist_items': ['id', 'watchlist_id', 'symbol', 'created_at', 'added_by'],
  'watchlist_collaborators': ['id', 'watchlist_id', 'user_id', 'permission_level', 'created_at'],
  'profiles': ['id', 'email', 'created_at', 'updated_at'],
  'research_notes': ['id', 'title', 'content', 'created_by', 'created_at', 'updated_at', 'is_public'],
};

// Type for validation results
type ValidationResult = {
  valid: boolean;
  version: number;
  missingTables: string[];
  missingFields: Record<string, string[]>;
  accessErrors: Record<string, string>;
};

/**
 * Validates the database schema against the expected schema
 * @returns A validation result object
 */
export const validateDatabaseSchema = async (): Promise<ValidationResult> => {
  const result: ValidationResult = {
    valid: true,
    version: SCHEMA_VERSION,
    missingTables: [],
    missingFields: {},
    accessErrors: {}
  };
  
  DEBUG && console.log('[SchemaValidator] Validating database schema...');
  
  try {
    // Check each required table
    for (const [table, requiredFields] of Object.entries(REQUIRED_TABLES)) {
      try {
        // Try to select a single row to check if table exists and is accessible
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          // Table access error
          result.valid = false;
          result.accessErrors[table] = error.message;
          
          if (error.code === 'PGRST116') {
            // No rows found is fine for schema validation
            // This just means the table exists but is empty
            DEBUG && console.log(`[SchemaValidator] Table ${table} exists but is empty`);
          } else if (error.code === 'PGRST205') {
            // Table doesn't exist
            result.missingTables.push(table);
            DEBUG && console.error(`[SchemaValidator] Table ${table} does not exist`);
          } else {
            // Other errors (permissions, etc.)
            DEBUG && console.error(`[SchemaValidator] Error accessing table ${table}:`, error);
          }
          continue;
        }
        
        // If we get here, the table exists - now check its fields
        // We can't directly introspect the schema, but we can use a query with selected
        // fields to see which ones exist
        
        // Create a query selecting all required fields
        const checkFieldsQuery = supabase
          .from(table)
          .select(requiredFields.join(','))
          .limit(1);
        
        const { error: fieldsError } = await checkFieldsQuery;
        
        if (fieldsError && fieldsError.code !== 'PGRST116') {
          // Field error - need to check which fields are missing
          result.valid = false;
          
          // Try fields one by one to identify missing ones
          const missingFields: string[] = [];
          
          for (const field of requiredFields) {
            const { error: fieldError } = await supabase
              .from(table)
              .select(field)
              .limit(1);
              
            if (fieldError && fieldError.code !== 'PGRST116') {
              missingFields.push(field);
              DEBUG && console.error(`[SchemaValidator] Field ${field} missing from table ${table}`);
            }
          }
          
          if (missingFields.length > 0) {
            result.missingFields[table] = missingFields;
          }
        }
      } catch (error) {
        console.error(`[SchemaValidator] Error validating table ${table}:`, error);
        result.valid = false;
        result.accessErrors[table] = error instanceof Error ? error.message : String(error);
      }
    }
    
    // Update stored schema version if validation passed
    if (result.valid) {
      setStoredSchemaVersion(SCHEMA_VERSION);
      DEBUG && console.log('[SchemaValidator] Schema validation passed, updated version to', SCHEMA_VERSION);
    } else {
      DEBUG && console.error('[SchemaValidator] Schema validation failed');
    }
    
    return result;
  } catch (error) {
    console.error('[SchemaValidator] Schema validation error:', error);
    return {
      valid: false,
      version: getStoredSchemaVersion(),
      missingTables: [],
      missingFields: {},
      accessErrors: {
        global: error instanceof Error ? error.message : String(error)
      }
    };
  }
};

/**
 * Check if the database schema needs to be validated
 * This is used to determine if we should run validation on startup
 * @returns True if schema validation is needed
 */
export const needsSchemaValidation = (): boolean => {
  // Validate schema if stored version is different from current version
  const storedVersion = getStoredSchemaVersion();
  return storedVersion !== SCHEMA_VERSION;
};

/**
 * Initialize the schema validator
 * This should be called once at application startup
 */
export const initSchemaValidator = async (): Promise<ValidationResult | null> => {
  try {
    // Check if we need to validate the schema
    if (needsSchemaValidation()) {
      DEBUG && console.log('[SchemaValidator] Schema validation needed, running validation...');
      return await validateDatabaseSchema();
    } else {
      DEBUG && console.log('[SchemaValidator] Schema already validated, skipping');
      return null;
    }
  } catch (error) {
    console.error('[SchemaValidator] Error initializing schema validator:', error);
    return null;
  }
};