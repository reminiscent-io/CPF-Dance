import { GooglePlacesInput, Input, Textarea } from '@/components/ui'
import type { ClassType, PricingModel, Studio } from '@/lib/types'
import { AssetSelector } from '@/components/AssetSelector'
import { DAY_NAMES, DURATION_OPTIONS, formatDuration, parseCurrency } from './class-helpers'
import type { ClassFormController } from './useClassForm'

export function ClassTitleField({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return (
    <Input
      label="Class Title *"
      required
      value={formData.title}
      onChange={(e) => patchForm({ title: e.target.value })}
    />
  )
}

export function ClassInstructorField({ form }: { form: ClassFormController }) {
  const { formData, patchForm, instructors } = form
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal-700 mb-1">
        Instructor (leave blank to use yourself)
      </label>
      <select
        className="w-full px-4 py-2 border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
        value={formData.instructor_id || ''}
        onChange={(e) => patchForm({ instructor_id: e.target.value })}
      >
        <option value="">Use me as the instructor</option>
        {instructors.map(instructor => (
          <option key={instructor.id} value={instructor.id}>
            {instructor.full_name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ClassDescriptionField({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return (
    <Textarea
      label="Description"
      rows={2}
      value={formData.description}
      onChange={(e) => patchForm({ description: e.target.value })}
    />
  )
}

export function ClassStudioField({ form, studios }: { form: ClassFormController; studios: Studio[] }) {
  const { formData, patchForm, isCreatingNewStudio, setIsCreatingNewStudio } = form
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal-700 mb-2">
        Studio
      </label>
      <div className="flex gap-4 mb-2">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="studioOption"
            checked={!isCreatingNewStudio}
            onChange={() => {
              setIsCreatingNewStudio(false)
              patchForm({ newStudioName: '' })
            }}
            className="mr-2 text-rose-600 focus:ring-rose-500"
          />
          <span className="text-sm text-charcoal-700">Select existing</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="studioOption"
            checked={isCreatingNewStudio}
            onChange={() => {
              setIsCreatingNewStudio(true)
              patchForm({ studio_id: '' })
            }}
            className="mr-2 text-rose-600 focus:ring-rose-500"
          />
          <span className="text-sm text-charcoal-700">Create new</span>
        </label>
      </div>

      {isCreatingNewStudio ? (
        <Input
          placeholder="Enter new studio name"
          value={formData.newStudioName || ''}
          onChange={(e) => patchForm({ newStudioName: e.target.value })}
        />
      ) : (
        <select
          className="w-full px-4 py-2 border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          value={formData.studio_id}
          onChange={(e) => patchForm({ studio_id: e.target.value })}
        >
          <option value="">Select a studio</option>
          {studios.map(studio => (
            <option key={studio.id} value={studio.id}>
              {studio.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export function ClassTypeField({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal-700 mb-1">
        Class Type *
      </label>
      <select
        required
        className="w-full px-4 py-2 border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
        value={formData.class_type}
        onChange={(e) => patchForm({ class_type: e.target.value as ClassType })}
      >
        <option value="group">Group</option>
        <option value="private">Private</option>
        <option value="workshop">Workshop</option>
        <option value="master_class">Master Class</option>
        <option value="competition_choreography">Competition Choreography</option>
      </select>
    </div>
  )
}

export function ClassLocationField({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return formData.is_virtual ? (
    <p className="text-xs text-charcoal-500">
      A Google Meet link is created automatically on Courtney&rsquo;s calendar and shared with the
      dancer by email and in the app. No in-person location needed.
    </p>
  ) : (
    <GooglePlacesInput
      label="Location"
      value={formData.location || ''}
      onChange={(value) => patchForm({ location: value })}
      placeholder="Search for class location..."
    />
  )
}

export function ClassScheduleFields({ form }: { form: ClassFormController }) {
  const { formData, patchForm, durationMinutes, setDurationMinutes } = form
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input
        label="Start Time (ET) *"
        type="datetime-local"
        step="300"
        required
        value={formData.start_time}
        onChange={(e) => patchForm({ start_time: e.target.value })}
      />
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1">
          Length *
        </label>
        <select
          required
          className="w-full px-4 py-2 border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
        >
          {DURATION_OPTIONS.map(minutes => (
            <option key={minutes} value={minutes}>
              {formatDuration(minutes)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function ClassCapacityField({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return (
    <Input
      label="Max Capacity"
      type="number"
      min="1"
      value={formData.max_capacity || ''}
      onChange={(e) => patchForm({ max_capacity: e.target.value ? parseInt(e.target.value) : undefined })}
    />
  )
}

export function ClassSignupLinkField({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return (
    <>
      <Input
        label="External Sign-up Link"
        type="url"
        placeholder="https://eventbrite.com/..."
        value={formData.external_signup_url || ''}
        onChange={(e) => patchForm({ external_signup_url: e.target.value })}
      />
      <p className="text-xs text-charcoal-500 -mt-2 mb-2">
        Optional: Add a URL for classes booked through external platforms (e.g., Eventbrite)
      </p>
    </>
  )
}

export function ClassPublicField({ form, id }: { form: ClassFormController; id: string }) {
  const { formData, patchForm } = form
  return (
    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
      <input
        type="checkbox"
        id={id}
        checked={formData.is_public || false}
        onChange={(e) => patchForm({ is_public: e.target.checked })}
        className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-champagne-200 rounded"
      />
      <label htmlFor={id} className="text-sm font-medium text-charcoal-700 cursor-pointer">
        Make class public for dancers and guardians to view and enroll
      </label>
    </div>
  )
}

export function ClassPricingFields({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1">
          Pricing Model *
        </label>
        <select
          required
          className="w-full px-4 py-2 border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          value={formData.pricing_model || 'per_person'}
          onChange={(e) => patchForm({ pricing_model: e.target.value as PricingModel })}
        >
          <option value="per_person">Per Person</option>
          <option value="per_class">Per Class (Flat Rate)</option>
          <option value="per_hour">Per Hour</option>
          <option value="tiered">Tiered (Base + Additional)</option>
        </select>
      </div>

      {/* Conditional pricing fields based on selected model */}
      {formData.pricing_model === 'per_person' && (
        <Input
          label="Cost Per Person ($) *"
          type="number"
          min="0"
          step="0.01"
          required
          value={formData.cost_per_person || ''}
          onChange={(e) => patchForm({ cost_per_person: parseCurrency(e.target.value) })}
          placeholder="e.g., 25.00"
        />
      )}

      {formData.pricing_model === 'per_class' && (
        <Input
          label="Base Cost (Flat Rate) ($) *"
          type="number"
          min="0"
          step="0.01"
          required
          value={formData.base_cost || ''}
          onChange={(e) => patchForm({ base_cost: parseCurrency(e.target.value) })}
          placeholder="e.g., 150.00"
        />
      )}

      {formData.pricing_model === 'per_hour' && (
        <Input
          label="Cost Per Hour ($) *"
          type="number"
          min="0"
          step="0.01"
          required
          value={formData.cost_per_hour || ''}
          onChange={(e) => patchForm({ cost_per_hour: parseCurrency(e.target.value) })}
          placeholder="e.g., 75.00"
        />
      )}

      {formData.pricing_model === 'tiered' && (
        <div className="space-y-4 p-4 bg-champagne-100 rounded-lg border border-champagne-200">
          <p className="text-sm text-charcoal-500">Set a base cost for the first X students, then charge per additional student</p>
          <Input
            label="Base Cost ($) *"
            type="number"
            min="0"
            step="0.01"
            required
            value={formData.base_cost || ''}
            onChange={(e) => patchForm({ base_cost: parseCurrency(e.target.value) })}
            placeholder="e.g., 100.00"
          />
          <Input
            label="Students Included in Base Cost *"
            type="number"
            min="1"
            required
            value={formData.tiered_base_students || ''}
            onChange={(e) => patchForm({ tiered_base_students: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="e.g., 5"
          />
          <Input
            label="Cost Per Additional Student ($) *"
            type="number"
            min="0"
            step="0.01"
            required
            value={formData.tiered_additional_cost || ''}
            onChange={(e) => patchForm({ tiered_additional_cost: parseCurrency(e.target.value) })}
            placeholder="e.g., 15.00"
          />
        </div>
      )}
    </>
  )
}

export function ClassAssetField({ form }: { form: ClassFormController }) {
  const { formData, patchForm } = form
  return (
    <AssetSelector
      selectedAssetId={formData.asset_id}
      onSelect={(assetId) => patchForm({ asset_id: assetId })}
      label="Promotional Image/Document (Optional)"
      showUploadButton={true}
    />
  )
}

export function WeekdayPicker({
  selectedDays,
  onChange,
}: {
  selectedDays: number[]
  onChange: (days: number[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DAY_NAMES.map((day, index) => (
        <button
          key={day}
          type="button"
          onClick={() => {
            if (selectedDays.includes(index)) {
              onChange(selectedDays.filter(d => d !== index))
            } else {
              onChange([...selectedDays, index])
            }
          }}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
            selectedDays.includes(index)
              ? 'bg-rose-600 text-champagne-50 border-rose-600'
              : 'bg-champagne-50 text-charcoal-700 border-champagne-200 hover:border-rose-400'
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  )
}
