"""File watcher for detecting CSV changes."""
import os
import hashlib
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import pandas as pd
from data_cleaner import DataCleaner
from cache_manager import CacheManager

logger = logging.getLogger(__name__)


class CSVChangeHandler(FileSystemEventHandler):
    """Handles CSV file change events."""
    
    def __init__(self, csv_path: str, cache_manager: CacheManager):
        """
        Initialize the handler.
        
        Args:
            csv_path: Path to the CSV file to watch
            cache_manager: CacheManager instance
        """
        self.csv_path = csv_path
        self.cache_manager = cache_manager
        self.data_cleaner = DataCleaner()
        
    def on_modified(self, event):
        """Handle file modification event."""
        if event.src_path == self.csv_path and not event.is_directory:
            logger.info(f"Detected change in {self.csv_path}")
            self.process_csv_change()
    
    def process_csv_change(self):
        """Process CSV file changes - clean data and recalculate statistics."""
        try:
            # Calculate file hash
            file_hash = self._calculate_file_hash(self.csv_path)
            cached_hash = self.cache_manager.get_file_hash(self.csv_path)
            
            # Check if file actually changed
            if file_hash == cached_hash:
                logger.info("File hash unchanged, skipping processing")
                return
            
            logger.info("File changed, starting data processing")
            
            # Read and clean data
            df = pd.read_csv(self.csv_path)
            cleaned_df = self.data_cleaner.clean_dataset(df)
            
            # Cache cleaned data
            self.cache_manager.set_dataframe('cleaned_data', cleaned_df, expiry=0)  # No expiry
            logger.info("Cached cleaned dataset")
            
            # Calculate and cache statistics
            stats = self.data_cleaner.calculate_statistics(cleaned_df)
            self.cache_manager.set('statistics', stats, expiry=0)  # No expiry
            logger.info("Cached statistics")
            
            # Update file hash
            self.cache_manager.set_file_hash(self.csv_path, file_hash)
            
            logger.info("Data processing completed successfully")
            
        except Exception as e:
            logger.error(f"Error processing CSV change: {e}", exc_info=True)
    
    def _calculate_file_hash(self, filepath: str) -> str:
        """Calculate MD5 hash of file."""
        hash_md5 = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()


class FileWatcher:
    """Watches for file changes and triggers processing."""
    
    def __init__(self, csv_path: str, cache_manager: CacheManager):
        """
        Initialize the file watcher.
        
        Args:
            csv_path: Path to CSV file to watch
            cache_manager: CacheManager instance
        """
        self.csv_path = os.path.abspath(csv_path)
        self.watch_dir = os.path.dirname(self.csv_path)
        self.cache_manager = cache_manager
        self.observer = None
        
    def start(self):
        """Start watching for file changes."""
        try:
            event_handler = CSVChangeHandler(self.csv_path, self.cache_manager)
            
            # Process the file initially
            logger.info("Processing CSV file initially")
            event_handler.process_csv_change()
            
            # Start watching
            self.observer = Observer()
            self.observer.schedule(event_handler, self.watch_dir, recursive=False)
            self.observer.start()
            logger.info(f"Started watching {self.csv_path}")
            
        except Exception as e:
            logger.error(f"Error starting file watcher: {e}")
    
    def stop(self):
        """Stop watching for file changes."""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("Stopped file watcher")
