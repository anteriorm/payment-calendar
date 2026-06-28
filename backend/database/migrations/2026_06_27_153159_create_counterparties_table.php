<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('counterparties', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('inn')->nullable();
            $table->text('details')->nullable(); // реквизиты
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counterparties');
    }
};
