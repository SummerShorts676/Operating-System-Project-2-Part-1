"""Redis cache manager for diet data."""
import redis
import json
import logging
import os
from typing import Any, Optional
import pandas as pd

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages Redis caching operations."""
    
    def __init__(self):
        """Initialize Redis connection."""
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis_db = int(os.getenv('REDIS_DB', 0))
        
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {self.redis_host}:{self.redis_port}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False
    
    def set(self, key: str, value: Any, expiry: int = 3600) -> bool:
        """
        Set a value in cache.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            expiry: Expiry time in seconds (default 1 hour, 0 for no expiry)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_connected():
            logger.warning("Redis not connected, skipping cache set")
            return False
        
        try:
            serialized = json.dumps(value)
            if expiry == 0:
                # No expiry - use set instead of setex
                self.redis_client.set(key, serialized)
                logger.debug(f"Cached key: {key} (no expiry)")
            else:
                self.redis_client.setex(key, expiry, serialized)
                logger.debug(f"Cached key: {key} (expiry: {expiry}s)")
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self.is_connected():
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                logger.debug(f"Cache hit: {key}")
                return json.loads(value)
            logger.debug(f"Cache miss: {key}")
            return None
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        if not self.is_connected():
            return False
        
        try:
            self.redis_client.delete(key)
            logger.debug(f"Deleted cache key: {key}")
            return True
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    def clear_all(self) -> bool:
        """Clear all cache entries."""
        if not self.is_connected():
            return False
        
        try:
            self.redis_client.flushdb()
            logger.info("Cleared all cache entries")
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    def set_dataframe(self, key: str, df: pd.DataFrame, expiry: int = 3600) -> bool:
        """
        Cache a pandas DataFrame.
        
        Args:
            key: Cache key
            df: DataFrame to cache
            expiry: Expiry time in seconds
            
        Returns:
            True if successful
        """
        try:
            # Convert DataFrame to JSON records
            records = df.to_dict('records')
            return self.set(key, records, expiry)
        except Exception as e:
            logger.error(f"Error caching DataFrame: {e}")
            return False
    
    def get_dataframe(self, key: str) -> Optional[pd.DataFrame]:
        """
        Get a cached DataFrame.
        
        Args:
            key: Cache key
            
        Returns:
            DataFrame or None if not found
        """
        records = self.get(key)
        if records:
            return pd.DataFrame(records)
        return None
    
    def get_file_hash(self, filepath: str) -> Optional[str]:
        """Get the cached file hash."""
        return self.get(f"file_hash:{filepath}")
    
    def set_file_hash(self, filepath: str, file_hash: str) -> bool:
        """Set the file hash (no expiry for file tracking)."""
        if not self.is_connected():
            return False
        
        try:
            self.redis_client.set(f"file_hash:{filepath}", file_hash)
            return True
        except Exception as e:
            logger.error(f"Error setting file hash: {e}")
            return False
