# Class Pricing Structure Guide

## Overview

The class pricing system supports four different pricing models to accommodate various teaching scenarios:

1. **Per Person** - Charge each student individually
2. **Per Class** - Flat rate for the entire class
3. **Per Hour** - Charge based on class duration
4. **Tiered** - Base cost for initial students + additional fee for extra students

## Database Schema

### Migration

Run `supabase-pricing-migration.sql` in your Supabase SQL Editor to add the new pricing fields to your database.

### Pricing Fields

```sql
pricing_model pricing_model DEFAULT 'per_person'
base_cost DECIMAL(10, 2)              -- Base/flat cost
cost_per_person DECIMAL(10, 2)         -- Cost per student
cost_per_hour DECIMAL(10, 2)           -- Cost per hour
tiered_base_students INTEGER           -- Students included in base cost
tiered_additional_cost DECIMAL(10, 2)  -- Cost per additional student
```

## Pricing Models Explained

### 1. Per Person Pricing
**Use Case:** Traditional classes where each student pays the same amount

**Required Fields:**
- `cost_per_person`: Amount each student pays

**Calculation:**
```
Total Cost = Number of Students × Cost Per Person
```

**Example:**
- Cost per person: $25
- 8 students enrolled
- **Total: $200**

---

### 2. Per Class (Flat Rate)
**Use Case:** Workshops, master classes, or private sessions with a fixed fee

**Required Fields:**
- `base_cost`: Fixed amount for the entire class

**Calculation:**
```
Total Cost = Base Cost (regardless of enrollment)
```

**Example:**
- Base cost: $150
- Any number of students (up to capacity)
- **Total: $150**

---

### 3. Per Hour Pricing
**Use Case:** Private lessons or sessions billed by duration

**Required Fields:**
- `cost_per_hour`: Hourly rate
- `start_time` and `end_time`: Used to calculate duration

**Calculation:**
```
Duration = End Time - Start Time (in hours)
Total Cost = Duration × Cost Per Hour
```

**Example:**
- Cost per hour: $75
- Class duration: 1.5 hours
- **Total: $112.50**

---

### 4. Tiered Pricing
**Use Case:** Classes with a base fee covering initial students, then incremental charges for additional students

**Required Fields:**
- `base_cost`: Base fee covering initial students
- `tiered_base_students`: Number of students included in base cost
- `tiered_additional_cost`: Cost per student beyond the base count

**Calculation:**
```
If enrolled ≤ base students:
  Total Cost = Base Cost

If enrolled > base students:
  Additional Students = Enrolled - Base Students
  Total Cost = Base Cost + (Additional Students × Additional Cost)
```

**Example:**
- Base cost: $100 (covers first 5 students)
- Tiered base students: 5
- Additional cost per student: $15
- 8 students enrolled
- Additional students: 8 - 5 = 3
- **Total: $100 + (3 × $15) = $145**

## Using the Pricing System

### Creating a Class with Pricing

```typescript
import { CreateClassData, PricingModel } from '@/lib/types'

// Example 1: Per Person Pricing
const perPersonClass: CreateClassData = {
  title: "Ballet Fundamentals",
  class_type: "group",
  start_time: "2025-12-01T10:00:00Z",
  end_time: "2025-12-01T11:00:00Z",
  pricing_model: "per_person",
  cost_per_person: 25,
  max_capacity: 15
}

// Example 2: Flat Rate Pricing
const flatRateWorkshop: CreateClassData = {
  title: "Choreography Workshop",
  class_type: "workshop",
  start_time: "2025-12-05T14:00:00Z",
  end_time: "2025-12-05T17:00:00Z",
  pricing_model: "per_class",
  base_cost: 200,
  max_capacity: 20
}

// Example 3: Hourly Pricing
const privateLesson: CreateClassData = {
  title: "Private Jazz Lesson",
  class_type: "private",
  start_time: "2025-12-03T15:00:00Z",
  end_time: "2025-12-03T16:30:00Z",
  pricing_model: "per_hour",
  cost_per_hour: 80,
  max_capacity: 1
}

// Example 4: Tiered Pricing
const tieredClass: CreateClassData = {
  title: "Contemporary Dance",
  class_type: "group",
  start_time: "2025-12-04T18:00:00Z",
  end_time: "2025-12-04T19:30:00Z",
  pricing_model: "tiered",
  base_cost: 120,           // Covers first 6 students
  tiered_base_students: 6,
  tiered_additional_cost: 18, // Each additional student
  max_capacity: 12
}
```

### Calculating Costs

```typescript
import { calculateClassCost, getPricingModelDescription, formatPrice } from '@/lib/utils/pricing'

// Get the total cost for a class
const totalCost = calculateClassCost(classData, enrolledCount)

// Get a human-readable description
const description = getPricingModelDescription(classData)
// Output: "$25 per student" or "$120 for first 6 students, then $18 per additional student"

// Format for display
const formatted = formatPrice(totalCost)
// Output: "$150.00"
```

### Validating Pricing Data

```typescript
import { validatePricingData } from '@/lib/utils/pricing'

const validation = validatePricingData('tiered', {
  base_cost: 100,
  tiered_base_students: 5,
  tiered_additional_cost: 15
})

if (!validation.valid) {
  console.error(validation.error)
}
```

## API Endpoints

When creating or updating classes via the API, include the relevant pricing fields:

```bash
POST /api/classes
Content-Type: application/json

{
  "title": "Advanced Hip Hop",
  "class_type": "group",
  "start_time": "2025-12-10T19:00:00Z",
  "end_time": "2025-12-10T20:30:00Z",
  "pricing_model": "tiered",
  "base_cost": 150,
  "tiered_base_students": 8,
  "tiered_additional_cost": 20,
  "max_capacity": 15
}
```

## UI Components

When building forms for class creation/editing, show conditional fields based on the selected pricing model:

```typescript
{pricingModel === 'per_person' && (
  <Input
    label="Cost Per Person"
    type="number"
    step="0.01"
    value={costPerPerson}
    onChange={(e) => setCostPerPerson(Number(e.target.value))}
  />
)}

{pricingModel === 'per_class' && (
  <Input
    label="Base Cost (Flat Rate)"
    type="number"
    step="0.01"
    value={baseCost}
    onChange={(e) => setBaseCost(Number(e.target.value))}
  />
)}

{pricingModel === 'per_hour' && (
  <Input
    label="Cost Per Hour"
    type="number"
    step="0.01"
    value={costPerHour}
    onChange={(e) => setCostPerHour(Number(e.target.value))}
  />
)}

{pricingModel === 'tiered' && (
  <>
    <Input label="Base Cost" type="number" step="0.01" value={baseCost} />
    <Input label="Base Number of Students" type="number" min="1" value={tieredBaseStudents} />
    <Input label="Cost Per Additional Student" type="number" step="0.01" value={tieredAdditionalCost} />
  </>
)}
```

## Backward Compatibility

The legacy `price` field is still present in the database for backward compatibility. When migrating:

1. Existing classes will have their `price` value copied to `cost_per_person`
2. Their `pricing_model` will be set to `'per_person'`
3. Old code referencing `price` will continue to work
4. New code should use the `pricing_model` fields

## Best Practices

1. **Choose the right model**: Match your pricing model to your teaching style
2. **Set max_capacity**: Especially important for tiered pricing to control costs
3. **Validate input**: Use `validatePricingData()` before saving
4. **Display clearly**: Show students exactly how pricing works for each class
5. **Calculate totals**: Use `calculateClassCost()` for accurate cost display

## Migration Checklist

- [ ] Run `supabase-pricing-migration.sql` in Supabase SQL Editor
- [ ] Verify existing classes have `pricing_model` set to `'per_person'`
- [ ] Update class creation forms to include pricing model selector
- [ ] Update class display components to show pricing information
- [ ] Test all four pricing models with real data
- [ ] Update any payment processing to use new pricing calculations
- [ ] Consider removing legacy `price` field after full migration (optional)
