"""
main.py

Entry point for the Carbonomics-AI Carbon Accounting Module.

This module:
1. Accepts electricity consumption from the user.
2. Validates the input.
3. Calculates carbon emissions.
4. Displays the final result.
"""

from calculations import calculate_electricity_emissions
from validator import (
    validate_not_empty,
    validate_number,
    validate_non_negative,
)


def main():
    """Run the Carbon Accounting application."""

    print("=" * 50)
    print("          Carbonomics-AI")
    print("     Carbon Accounting Module")
    print("=" * 50)

    try:
        electricity_input = input(
            "\nEnter electricity consumption (kWh): "
        )

        validate_not_empty(electricity_input)

        electricity_kwh = validate_number(electricity_input)

        validate_non_negative(electricity_kwh)

        electricity_emissions = calculate_electricity_emissions(
            electricity_kwh
        )

        print("\n---------- Result ----------")
        print(f"Electricity Consumption : {electricity_kwh:.2f} kWh")
        print(
            f"Carbon Emissions        : "
            f"{electricity_emissions:.2f} kg CO₂e"
        )
        print("----------------------------")

    except ValueError as error:
        print(f"\nError: {error}")


if __name__ == "__main__":
    main()