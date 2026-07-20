-- עמודה להעדפות מבחן ההתאמה של האופנועים, מקבילה ל car_prefs.
-- בטוח להרצה חוזרת. להריץ ב SQL Editor של סופבייס.
alter table profiles add column if not exists moto_prefs jsonb;
