<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type EventOut = components['schemas']['EventOut']

// The public information of an event, edited where it shows: in its tab.
const { event } = defineProps<{ event: EventOut }>()

const emit = defineEmits<{ saved: [event: EventOut] }>()

const fields = ref(publicInfoFields(event))
const errors = ref<FormErrors | null>(null)
const pending = ref(false)
const saved = ref(false)

const { saveEvent } = useEventWrites()

const venueAddressHelp = computed(() => `Celle de « ${event.venue_name} ».`)

const form = useTemplateRef<HTMLFormElement>('form')

function fieldErrors(path: string): readonly string[] | undefined {
  return errors.value?.fields[path]
}

// An error of a line is located by its position, which moving or taking away
// a line changes: the errors of the list are forgotten rather than misplaced.
function restructured(list: 'programme' | 'practical_infos'): void {
  saved.value = false
  if (!errors.value) return
  const fieldsLeft = Object.entries(errors.value.fields).filter(([path]) => !path.startsWith(`${list}.`))
  errors.value = { ...errors.value, fields: Object.fromEntries(fieldsLeft) }
}

async function save(): Promise<void> {
  pending.value = true
  saved.value = false
  const result = await saveEvent({ ...receivedEventIn(event), ...publicInfoPayload(fields.value) }, event.id)
  pending.value = false
  if (result.errors) {
    errors.value = placeErrors(result.errors, publicInfoPaths(fields.value), eventFieldLabel)
    await focusErrors(form)
    return
  }
  errors.value = null
  // The API's own version: lines tidied, coordinates as it read them.
  fields.value = publicInfoFields(result.data)
  saved.value = true
  emit('saved', result.data)
}
</script>

<template>
  <form
    ref="form"
    class="flex max-w-3xl flex-col gap-5"
    @submit.prevent="save"
    @input="saved = false"
  >
    <UiAlert
      v-if="errors?.form.length"
      tabindex="-1"
    >
      <p
        v-for="message in errors.form"
        :key="message"
      >
        {{ message }}
      </p>
    </UiAlert>
    <UiCard title="Publication">
      <UiSwitch
        v-model="fields.published"
        :label="EVENT_FIELD_LABELS.published"
      />
      <UiField
        v-slot="{ control }"
        :label="EVENT_FIELD_LABELS.summary"
        optional
        help="Le texte d’introduction de sa page sur le site."
        :errors="fieldErrors('summary')"
      >
        <UiTextarea
          v-bind="control"
          v-model="fields.summary"
          rows="3"
        />
      </UiField>
    </UiCard>
    <UiCard title="Lieu">
      <UiField
        v-slot="{ control }"
        :label="EVENT_FIELD_LABELS.venue_address"
        optional
        :help="venueAddressHelp"
        :errors="fieldErrors('venue_address')"
      >
        <UiInput
          v-bind="control"
          v-model="fields.venue_address"
        />
      </UiField>
      <div class="grid gap-4 md:grid-cols-2">
        <UiField
          v-slot="{ control }"
          :label="EVENT_FIELD_LABELS.latitude"
          optional
          help="Pour la carte de sa page : 49,4183, par exemple."
          :errors="fieldErrors('latitude')"
        >
          <UiInput
            v-bind="control"
            v-model="fields.latitude"
            inputmode="decimal"
            pattern="-?\d+([.,]\d+)?"
          />
        </UiField>
        <UiField
          v-slot="{ control }"
          :label="EVENT_FIELD_LABELS.longitude"
          optional
          help="1,9851, par exemple."
          :errors="fieldErrors('longitude')"
        >
          <UiInput
            v-bind="control"
            v-model="fields.longitude"
            inputmode="decimal"
            pattern="-?\d+([.,]\d+)?"
          />
        </UiField>
      </div>
    </UiCard>
    <UiCard title="Tarif">
      <div class="grid gap-4 md:grid-cols-2">
        <UiField
          v-slot="{ control }"
          :label="EVENT_FIELD_LABELS.price_label"
          optional
          help="« Gratuit », « 3 € le carton »…"
          :errors="fieldErrors('price_label')"
        >
          <UiInput
            v-bind="control"
            v-model="fields.price_label"
          />
        </UiField>
        <UiField
          v-slot="{ control }"
          :label="EVENT_FIELD_LABELS.price_detail"
          optional
          help="« Goûter offert par le comité »…"
          :errors="fieldErrors('price_detail')"
        >
          <UiInput
            v-bind="control"
            v-model="fields.price_detail"
          />
        </UiField>
      </div>
    </UiCard>
    <UiCard :title="EVENT_FIELD_LABELS.programme">
      <EventsOrderedLines
        v-model="fields.programme"
        :new-line="newProgrammeItemLine"
        add-label="Ajouter une ligne"
        @restructured="restructured('programme')"
      >
        <template #default="{ line, index }">
          <div class="flex flex-col gap-3 md:flex-row">
            <UiField
              v-slot="{ control }"
              label="Heure"
              :errors="fieldErrors(`programme.${index}.time`)"
              class="md:w-36"
            >
              <UiInput
                v-bind="control"
                v-model="line.time"
                type="time"
                required
              />
            </UiField>
            <UiField
              v-slot="{ control }"
              label="Titre"
              :errors="fieldErrors(`programme.${index}.title`)"
              class="min-w-0 flex-1"
            >
              <UiInput
                v-bind="control"
                v-model="line.title"
                required
              />
            </UiField>
          </div>
          <UiField
            v-slot="{ control }"
            label="Description"
            optional
            :errors="fieldErrors(`programme.${index}.description`)"
          >
            <UiTextarea
              v-bind="control"
              v-model="line.description"
              rows="2"
            />
          </UiField>
        </template>
      </EventsOrderedLines>
    </UiCard>
    <UiCard :title="EVENT_FIELD_LABELS.practical_infos">
      <EventsOrderedLines
        v-model="fields.practical_infos"
        :new-line="newPracticalInfoLine"
        add-label="Ajouter une ligne"
        @restructured="restructured('practical_infos')"
      >
        <template #default="{ line, index }">
          <div class="flex flex-col gap-3 md:flex-row">
            <UiField
              v-slot="{ control }"
              label="Icône"
              :errors="fieldErrors(`practical_infos.${index}.icon`)"
              class="md:w-64"
            >
              <div class="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  class="inline-flex size-10 shrink-0 items-center justify-center rounded-field bg-azur-100 text-azur-600"
                >
                  <component
                    :is="PRACTICAL_INFO_ICONS[line.icon].icon"
                    :size="20"
                  />
                </span>
                <div class="min-w-0 flex-1">
                  <UiSelect
                    v-bind="control"
                    v-model="line.icon"
                    :options="ICON_OPTIONS"
                    required
                  />
                </div>
              </div>
            </UiField>
            <UiField
              v-slot="{ control }"
              label="Titre"
              :errors="fieldErrors(`practical_infos.${index}.title`)"
              class="min-w-0 flex-1"
            >
              <UiInput
                v-bind="control"
                v-model="line.title"
                required
              />
            </UiField>
          </div>
          <UiField
            v-slot="{ control }"
            label="Texte"
            optional
            :errors="fieldErrors(`practical_infos.${index}.text`)"
          >
            <UiTextarea
              v-bind="control"
              v-model="line.text"
              rows="2"
            />
          </UiField>
        </template>
      </EventsOrderedLines>
    </UiCard>
    <div class="flex flex-wrap items-center gap-4">
      <UiButton
        type="submit"
        :loading="pending"
      >
        Enregistrer
      </UiButton>
      <p
        role="status"
        class="text-sm font-medium text-azur-700"
      >
        <template v-if="saved">
          Modifications enregistrées.
        </template>
      </p>
    </div>
  </form>
</template>
