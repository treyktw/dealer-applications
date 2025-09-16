# Updated generate_clients.py script

import csv
import uuid
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# Updated to match your frontend expectations
lead_sources = ["Google Ads", "Referral", "Walk-in", "Website", "Event", "Instagram", "Facebook", "Trade Show", "Print Ad"]
statuses = ["LEAD", "CUSTOMER", "PREVIOUS"]  # Updated to match your schema

def generate_client_entry(dealership_id=None):
    first_name = fake.first_name()
    last_name = fake.last_name()
    email = fake.email()
    phone = fake.phone_number()
    address = fake.street_address()
    city = fake.city()
    state = fake.state_abbr()
    zip_code = fake.zipcode()
    source = random.choice(lead_sources)
    status = random.choice(statuses)
    notes = fake.paragraph(nb_sentences=2) if random.choice([True, False]) else ""
    
    # Match the expected CSV headers from your import dialog
    return [
        first_name,           # First Name
        last_name,           # Last Name
        email,               # Email
        phone,               # Phone
        address,             # Address
        city,                # City
        state,               # State
        zip_code,            # Zip
        source,              # Source
        status               # Status
        # Note: removed notes, dealershipId, createdAt, updatedAt as they're not in the template
    ]

def generate_clients_csv(filename="clients_import.csv", count=50):
    # Headers that match your import dialog template
    headers = [
        "First Name",
        "Last Name", 
        "Email",
        "Phone",
        "Address",
        "City",
        "State",
        "Zip",
        "Source",
        "Status"
    ]
    
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        for _ in range(count):
            writer.writerow(generate_client_entry())
    
    print(f"{count} client entries written to {filename}")
    print(f"Headers: {', '.join(headers)}")

# Generate sample data with correct format
if __name__ == "__main__":
    generate_clients_csv("clients_import.csv", count=25)
    
    # Also create a minimal example file for testing
    minimal_data = [
        ["First Name", "Last Name", "Email", "Phone", "Address", "City", "State", "Zip", "Source", "Status"],
        ["John", "Doe", "john.doe@email.com", "(555) 123-4567", "123 Main St", "Anytown", "CA", "12345", "Website", "LEAD"],
        ["Jane", "Smith", "jane.smith@email.com", "(555) 987-6543", "456 Oak Ave", "Somewhere", "TX", "67890", "Referral", "CUSTOMER"],
        ["Bob", "Johnson", "bob.johnson@email.com", "(555) 456-7890", "789 Pine Rd", "Elsewhere", "NY", "54321", "Google Ads", "PREVIOUS"]
    ]
    
    with open("clients_test.csv", mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        for row in minimal_data:
            writer.writerow(row)
    
    print("Test file created: clients_test.csv")