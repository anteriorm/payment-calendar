<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incomes', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('amount');
            $table->date('planned_date');
            $table->foreignId('account_id')->constrained()->onDelete('restrict');
            $table->foreignId('counterparty_id')->constrained()->onDelete('restrict');
            $table->foreignId('item_id')->constrained()->onDelete('restrict');
            $table->string('purpose')->nullable();
            $table->enum('status', ['planned', 'received', 'canceled'])->default('planned');
            $table->timestamps();

            $table->index('planned_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incomes');
    }
};
