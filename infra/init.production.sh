#!/bin/sh
set -eu
# Restrict generated passwords to hexadecimal so SQL interpolation is safe.
for password in "$IDENTITY_DB_PASSWORD" "$ATTENDANCE_DB_PASSWORD"; do
  case "$password" in
    ''|*[!a-f0-9]*) echo 'Database passwords must be hexadecimal.' >&2; exit 1 ;;
  esac
done
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS identity_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'identity'@'%' IDENTIFIED BY '$IDENTITY_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'attendance'@'%' IDENTIFIED BY '$ATTENDANCE_DB_PASSWORD';
GRANT ALL PRIVILEGES ON identity_db.* TO 'identity'@'%';
GRANT ALL PRIVILEGES ON attendance_db.* TO 'attendance'@'%';
SQL
