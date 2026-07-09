<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Counterparties — добавить недостающие поля
        if (!Schema::hasColumn('counterparties', 'kpp')) {
            Schema::table('counterparties', function (Blueprint $table) {
                $table->string('kpp')->nullable()->after('inn');
                $table->string('bank_account')->nullable()->after('kpp');
                $table->string('bank_name')->nullable()->after('bank_account');
                $table->string('bik')->nullable()->after('bank_name');
                $table->enum('type', ['entity', 'individual', 'self_employed'])->default('entity')->after('bik');
                $table->string('contact')->nullable()->after('type');
            });
        }

        // Items — добавить code и group
        if (!Schema::hasColumn('items', 'code')) {
            Schema::table('items', function (Blueprint $table) {
                $table->string('code', 20)->default('00.00')->after('id');
                $table->string('group')->nullable()->after('type');
            });
        }

        // Incomes — добавить created_by
        if (!Schema::hasColumn('incomes', 'created_by')) {
            Schema::table('incomes', function (Blueprint $table) {
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            });
        }

        // Registries — добавить недостающие поля
        if (!Schema::hasColumn('registries', 'registry_date')) {
            Schema::table('registries', function (Blueprint $table) {
                $table->date('registry_date')->nullable()->after('id');
                $table->enum('status', ['created', 'paid', 'canceled'])->default('created')->after('registry_date');
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null')->after('status');
                $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null')->after('created_by');
            });
        }
    }

    public function down(): void
    {
        Schema::table('counterparties', function (Blueprint $table) {
            $table->dropColumn(['kpp', 'bank_account', 'bank_name', 'bik', 'type', 'contact']);
        });

        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['code', 'group']);
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn('created_by');
        });

        Schema::table('registries', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['registry_date', 'status', 'created_by', 'approved_by']);
        });
    }
};
