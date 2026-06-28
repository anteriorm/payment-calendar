<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function index()
    {
        return response()->json(Item::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:income,payment',
        ]);

        $item = Item::create($validated);
        return response()->json($item, 201);
    }

    public function show(Item $item)
    {
        return response()->json($item);
    }

    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:income,payment',
        ]);

        $item->update($validated);
        return response()->json($item);
    }

    public function destroy(Item $item)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        $item->delete();
        return response()->json(['message' => 'Статья удалена']);
    }
}
