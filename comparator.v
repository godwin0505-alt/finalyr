// comparator.v
// 16-bit comparator for Q8.8 fixed-point temperatures
module comparator(
    input [15:0] a,
    input [15:0] b,
    output reg [1:0] result  // Combined output: [gt, lt]
);
    always @(*) begin
        if (a > b) begin
            result = 2'b10;  // gt=1, lt=0
        end else if (a < b) begin
            result = 2'b01;  // gt=0, lt=1  
        end else begin
            result = 2'b00;  // gt=0, lt=0 (eq=1)
        end
    end
endmodule
