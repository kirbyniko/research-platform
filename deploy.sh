#!/bin/bash
git add -A
git commit -m "feat: implement multi-incident type selection

- Add incident_types TEXT[] array column to database
- Create GIN index for fast array queries
- Update API to accept and handle incident_types array
- Refactor extension to use checkbox multi-select instead of dropdown
- Support showing form sections for all selected types (union)
- Maintain backward compatibility with incident_type field
- Migrate existing data to array format"
git push
