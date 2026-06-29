<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('account_id')->nullable()->after('amount');
            $table->unsignedBigInteger('counterparty_id')->nullable()->after('account_id');
            $table->unsignedBigInteger('item_id')->nullable()->after('counterparty_id');
            $table->string('purpose')->nullable()->after('item_id');
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium')->after('purpose');
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'in_registry', 'paid'])->default('draft')->after('priority');
            $table->unsignedBigInteger('created_by')->nullable()->after('status');
            $table->unsignedBigInteger('registry_id')->nullable()->after('created_by');
        });
    }

    public function down()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'account_id',
                'counterparty_id',
                'item_id',
                'purpose',
                'priority',
                'status',
                'created_by',
                'registry_id'
            ]);
        });
    }
};
