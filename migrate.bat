@echo off
set DATABASE_URL=postgresql://neondb_owner:npg_Iibxz6j1lDcw@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
node scripts\migrate-real-data.js
