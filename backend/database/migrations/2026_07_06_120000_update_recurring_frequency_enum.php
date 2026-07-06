<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL uses ALTER TYPE ... ADD VALUE for enums
        // For SQLite (used in testing), we need to recreate the table
        $driver = DB::getDriverName();
        
        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_recurring_frequency_check");
            DB::statement("ALTER TABLE payments ALTER COLUMN recurring_frequency TYPE VARCHAR(255)");
            // Recreate as enum with new values
            DB::statement("ALTER TABLE payments ALTER COLUMN recurring_frequency TYPE VARCHAR(255)");
        }
        // For SQLite, the column is already VARCHAR, no change needed
    }

    public function down(): void
    {
        // No-op: reverting enum values could break existing data
    }
};
