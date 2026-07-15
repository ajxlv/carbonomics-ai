"""
main.py

Entry point for the Carbonomics-AI Carbon Accounting Module.
"""

from validator import (
    validate_not_empty,
    validate_number,
    validate_non_negative,
)

from calculations import (
    calculate_electricity_emissions,
    calculate_diesel_emissions,
    calculate_petrol_transport_emissions,
    calculate_diesel_transport_emissions,
    calculate_ev_transport_emissions,
    calculate_college_bus_emissions,
    calculate_public_bus_emissions,
    calculate_waste_emissions,
    calculate_methane_emissions,
    calculate_nitrous_oxide_emissions,
    calculate_total_emissions,
)


def get_valid_input(prompt):
    """
    Get validated numeric input from user.
    """

    value = input(prompt)

    validate_not_empty(value)

    value = validate_number(value)

    validate_non_negative(value)

    return value


def main():
    """Run Carbonomics-AI."""

    print("=" * 60)
    print("                 Carbonomics-AI")
    print("          Carbon Accounting Module")
    print("=" * 60)

    try:

        print("\nEnter Activity Data\n")

        electricity = get_valid_input("Electricity (kWh): ")

        diesel = get_valid_input("Diesel Consumption (L): ")

        petrol_distance = get_valid_input("Petrol Vehicle Distance (km): ")

        diesel_distance = get_valid_input("Diesel Vehicle Distance (km): ")

        ev = get_valid_input("EV Electricity Used (kWh): ")

        college_bus = get_valid_input("College Bus Distance (km): ")

        public_bus = get_valid_input("Public Bus Passenger-km: ")

        waste = get_valid_input("Waste Generated (kg): ")

        methane = get_valid_input("Methane (kg CH4): ")

        nitrous_oxide = get_valid_input("Nitrous Oxide (kg N2O): ")

        # ==================================================
        # Individual Calculations
        # ==================================================

        electricity_emission = calculate_electricity_emissions(electricity)

        diesel_emission = calculate_diesel_emissions(diesel)

        petrol_emission = calculate_petrol_transport_emissions(
            petrol_distance
        )

        diesel_vehicle_emission = calculate_diesel_transport_emissions(
            diesel_distance
        )

        ev_emission = calculate_ev_transport_emissions(ev)

        college_bus_emission = calculate_college_bus_emissions(
            college_bus
        )

        public_bus_emission = calculate_public_bus_emissions(
            public_bus
        )

        waste_emission = calculate_waste_emissions(waste)

        methane_emission = calculate_methane_emissions(methane)

        nitrous_oxide_emission = calculate_nitrous_oxide_emissions(
            nitrous_oxide
        )

        # ==================================================
        # Scope Calculations
        # ==================================================

        scope1 = (
            diesel_emission
            + college_bus_emission
        )

        scope2 = electricity_emission

        scope3 = (
            petrol_emission
            + diesel_vehicle_emission
            + ev_emission
            + public_bus_emission
            + waste_emission
            + methane_emission
            + nitrous_oxide_emission
        )

        total = calculate_total_emissions(
            scope1,
            scope2,
            scope3
        )

        # ==================================================
        # Output
        # ==================================================

        print("\n" + "=" * 60)
        print("              Carbon Emission Summary")
        print("=" * 60)

        print(f"\nScope 1 Emissions : {scope1:.2f} kg CO₂e")

        print(f"Scope 2 Emissions : {scope2:.2f} kg CO₂e")

        print(f"Scope 3 Emissions : {scope3:.2f} kg CO₂e")

        print("-" * 60)

        print(f"Total Carbon Footprint : {total:.2f} kg CO₂e")

        print("=" * 60)

    except ValueError as error:
        print(f"\nError: {error}")


if __name__ == "__main__":
    main()