<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('registries', function (Blueprint $table) {
            $table->date('registry_date')->nullable()->after('id');
            $table->enum('status', ['created', 'paid', 'canceled'])->default('created')->after('registry_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null')->after('status');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null')->after('created_by');
        });
    }

    public function down()
    {
        Schema::table('registries', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['registry_date', 'status', 'created_by', 'approved_by']);
        });
    }
};
