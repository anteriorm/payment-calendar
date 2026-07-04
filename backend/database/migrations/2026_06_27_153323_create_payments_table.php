<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('amount');
            $table->date('planned_date');
            $table->foreignId('account_id')->constrained()->onDelete('restrict');
            $table->foreignId('counterparty_id')->constrained()->onDelete('restrict');
            $table->foreignId('item_id')->constrained()->onDelete('restrict');
            $table->string('purpose')->nullable();
            $table->boolean('recurring')->default(false);
            $table->enum('recurring_frequency', ['monthly', 'weekly', 'quarterly'])->nullable();
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'in_registry', 'paid'])->default('draft');
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->unsignedBigInteger('registry_id')->nullable(); // поле без внешнего ключа
            // Внешний ключ удалён
            $table->timestamps();

            $table->index('planned_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
