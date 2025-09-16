import csv
import uuid
from faker import Faker

fake = Faker()

def generate_dealership_entry():
    return [
        str(uuid.uuid4()),
        fake.company() + " Motors",
        fake.street_address(),
        fake.city(),
        fake.state_abbr(),
        fake.zipcode(),
        fake.phone_number(),
        fake.company_email()
    ]

def generate_dealerships_csv(filename="dealerships.csv", count=5):
    headers = ["id", "name", "address", "city", "state", "zipCode", "phone", "email"]
    
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        dealerships = []
        for _ in range(count):
            row = generate_dealership_entry()
            writer.writerow(row)
            dealerships.append(row[0])  # collect dealership IDs
    print(f"{count} dealership entries written to {filename}")
    return dealerships

# If run standalone
if __name__ == "__main__":
    generate_dealerships_csv()
