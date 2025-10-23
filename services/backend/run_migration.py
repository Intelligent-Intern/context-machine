#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.service.migration import MigrationService

if __name__ == "__main__":
    migration_service = MigrationService()
    migration_service.setup_database()