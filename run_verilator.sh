#!/bin/bash

echo "🔧 Building Verilog comparator..."

# Ensure required tools are available. In CI environments, prefer using the provided Dockerfile which installs Verilator.
if ! command -v verilator &> /dev/null; then
    echo "❌ 'verilator' not found. Install Verilator or build using the Dockerfile (preferred)."
    exit 1
fi

# Ensure g++ exists
if ! command -v g++ &> /dev/null; then
    echo "❌ 'g++' not found. Install build-essential/g++ or build using the Dockerfile."
    exit 1
fi

# Clean previous build
rm -rf obj_dir

# Compile with Verilator
echo "🚀 Compiling Verilog..."
verilator -Wall --cc comparator.v --exe sim_main.cpp

# Build the C++ project
echo "🔨 Building executable..."
make -C obj_dir -f Vcomparator.mk Vcomparator

# Test the build
if [ -f "./obj_dir/Vcomparator" ]; then
    echo "✅ Verilator build successful!"
    echo "🧪 Testing comparator..."
    ./obj_dir/Vcomparator 10 5
    echo "💡 Test completed. Output should show comparison result."
else
    echo "❌ Verilator build failed!"
    exit 1
fi