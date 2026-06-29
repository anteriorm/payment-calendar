<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('approvals', function (Blueprint $table) {
            // Если колонки уже есть, они не добавятся повторно, но мы добавим проверку
            if (!Schema::hasColumn('approvals', 'payment_id')) {
                $table->unsignedBigInteger('payment_id')->nullable()->after('id');
                $table->foreign('payment_id')->references('id')->on('payments')->onDelete('cascade');
            }
            if (!Schema::hasColumn('approvals', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('payment_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            }
            if (!Schema::hasColumn('approvals', 'decision')) {
                $table->enum('decision', ['approved', 'rejected'])->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('approvals', 'comment')) {
                $table->text('comment')->nullable()->after('decision');
            }
        });
    }

    public function down()
    {
        Schema::table('approvals', function (Blueprint $table) {
            $table->dropForeign(['payment_id']);
            $table->dropForeign(['user_id']);
            $table->dropColumn(['payment_id', 'user_id', 'decision', 'comment']);
        });
    }
};
