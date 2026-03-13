// sim_main.cpp
#include "Vcomparator.h"
#include "verilated.h"
#include <iostream>
#include <cstdlib>

int main(int argc, char** argv) {
    Verilated::commandArgs(argc, argv);
    Vcomparator* top = new Vcomparator;

    if (argc < 3) {
        std::cerr << "Usage: ./Vcomparator <a> <b> [raw8]\n";
        return 1;
    }

    const bool raw8 = (argc >= 4) && (std::string(argv[3]) == "raw8");

    double aIn = std::stod(argv[1]);
    double bIn = std::stod(argv[2]);

    // When raw8 is set, treat inputs as plain 8-bit ints; otherwise use Q8.8 fixed-point
    int aFixed = raw8 ? static_cast<int>(aIn) : static_cast<int>(std::round(aIn * 256.0));
    int bFixed = raw8 ? static_cast<int>(bIn) : static_cast<int>(std::round(bIn * 256.0));

    // Clamp to 16-bit unsigned range to match widened HDL inputs
    auto clamp16 = [](int v) {
        if (v < 0) return 0;
        if (v > 0xFFFF) return 0xFFFF;
        return v;
    };

    aFixed = clamp16(aFixed);
    bFixed = clamp16(bFixed);

    top->a = aFixed;
    top->b = bFixed;
    top->eval();

    // result[1] = gt, result[0] = lt
    uint8_t result = top->result;

    if (result == 2) {        // 2'b10
        std::cout << "Result: A>B\n";
    } else if (result == 1) { // 2'b01
        std::cout << "Result: A<B\n";
    } else {                  // 2'b00
        std::cout << "Result: A==B\n";
    }

    std::cout << "Fixed A: " << aFixed << "\n";
    std::cout << "Fixed B: " << bFixed << "\n";

    delete top;
    return 0;
}