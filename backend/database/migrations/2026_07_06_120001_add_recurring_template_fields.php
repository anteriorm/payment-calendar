<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'next_date')) {
                $table->date('next_date')->nullable()->after('planned_date');
            }
            if (!Schema::hasColumn('payments', 'template_status')) {
                $table->enum('template_status', ['active', 'paused', 'completed'])->default('active')->after('status');
            }
            if (!Schema::hasColumn('payments', 'created_count')) {
                $table->integer('created_count')->default(0)->after('template_status');
            }
            if (!Schema::hasColumn('payments', 'last_created')) {
                $table->date('last_created')->nullable()->after('created_count');
            }
            if (!Schema::hasColumn('payments', 'end_date')) {
                $table->date('end_date')->nullable()->after('next_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['next_date', 'template_status', 'created_count', 'last_created', 'end_date']);
        });
    }
};
