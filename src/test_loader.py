"""
test_loader.py

Test script for validating the Carbonomics-AI calculation
engine using the first record of the institutional dataset.

Purpose:
- Verify dataset loading
- Verify emission calculations
- Verify scope calculations
- Verify total carbon footprint
"""

from data_loader import load_dataset

from calculations import (
    calculate_electricity_emissions,
    calculate_diesel_emissions,
    calculate_college_bus_emissions,
    calculate_waste_emissions,
    calculate_total_emissions,
)


def main():
    """
    Test Carbonomics-AI using the first row
    of the institutional dataset.
    """

    # ==========================================================
    # Load Dataset
    # ==========================================================

    dataset = load_dataset("data/raw/institutional_dataset.csv")

    # ==========================================================
    # Read First Record
    # ==========================================================

    first_row = dataset.iloc[0]

    # ==========================================================
    # Extract Activity Data
    # ==========================================================

    electricity = first_row["Electricity_kWh"]
    diesel = first_row["Generator_Diesel_L"]
    college_bus = first_row["College_Bus_Distance_km"]
    waste = first_row["Waste_Generated_kg"]

    # ==========================================================
    # Calculate Individual Emissions
    # ==========================================================

    electricity_emission = calculate_electricity_emissions(electricity)

    diesel_emission = calculate_diesel_emissions(diesel)

    college_bus_emission = calculate_college_bus_emissions(college_bus)

    waste_emission = calculate_waste_emissions(waste)

    # ==========================================================
    # Calculate Scope-wise Emissions
    # ==========================================================

    scope1 = diesel_emission + college_bus_emission

    scope2 = electricity_emission

    scope3 = waste_emission

    # ==========================================================
    # Calculate Total Carbon Footprint
    # ==========================================================

    total_emissions = calculate_total_emissions(
        scope1,
        scope2,
        scope3
    )

    # ==========================================================
    # Display Report
    # ==========================================================

    print("\n" + "=" * 70)
    print(" " * 23 + "Carbonomics-AI")
    print(" " * 12 + "Institutional Carbon Assessment Report")
    print("=" * 70)

    print("\nACTIVITY DATA")
    print("-" * 70)
    print(f"Electricity Consumption : {electricity:>10.2f} kWh")
    print(f"Generator Diesel        : {diesel:>10.2f} L")
    print(f"College Bus Distance    : {college_bus:>10.2f} km")
    print(f"Waste Generated         : {waste:>10.2f} kg")

    print("\nCARBON EMISSION SUMMARY")
    print("-" * 70)
    print(f"Scope 1 Emissions       : {scope1:>10.2f} kg CO₂e")
    print(f"Scope 2 Emissions       : {scope2:>10.2f} kg CO₂e")
    print(f"Scope 3 Emissions       : {scope3:>10.2f} kg CO₂e")

    print("-" * 70)
    print(f"Total Carbon Footprint  : {total_emissions:>10.2f} kg CO₂e")
    print("=" * 70)


if __name__ == "__main__":
    main()