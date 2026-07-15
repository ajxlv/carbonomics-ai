"""
data_loader.py

Load institutional activity data from CSV.
"""

import pandas as pd


def load_dataset(file_path):
    """
    Load dataset from CSV file.

    Parameters:
        file_path (str): Path to CSV file.

    Returns:
        pandas.DataFrame
    """

    return pd.read_csv(file_path)