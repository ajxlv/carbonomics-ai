"""
validator.py

Validation utilities for Carbonomics-AI.

This module validates user inputs before any carbon
emission calculations are performed.
"""


def validate_not_empty(value):
    """
    Check whether the input is empty.

    Parameters:
        value: User input

    Returns:
        True if valid.

    Raises:
        ValueError if input is empty.
    """

    if value is None or str(value).strip() == "":
        raise ValueError("Input cannot be empty.")

    return True


def validate_number(value):
    """
    Check whether input is numeric.

    Parameters:
        value: User input

    Returns:
        Float value.

    Raises:
        ValueError if input is not numeric.
    """

    try:
        return float(value)

    except ValueError:
        raise ValueError("Input must be a valid number.")


def validate_non_negative(value):
    """
    Ensure number is not negative.

    Parameters:
        value: Numeric input

    Returns:
        True if valid.

    Raises:
        ValueError if value is negative.
    """

    if value < 0:
        raise ValueError("Value cannot be negative.")

    return True