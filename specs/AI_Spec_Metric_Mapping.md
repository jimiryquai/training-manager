### The Metric Mapping (The "Polarity" Plan)

Here is how we should configure the six metrics based on your request and the Morpheus/ithlete references 1, 3:  
**Standard Polarity (1 \= Red / Bad ➡️ 5 \= Green / Good)**

* **Sleep:** 1 (Poor) to 5 (Excellent)  
* **Diet:** 1 (Poor) to 5 (Excellent)  
* **Mood:** 1 (Miserable) to 5 (Fantastic)

**Inverted Polarity (1 \= Green / Good ➡️ 5 \= Red / Bad)**

* **Muscle Soreness:** 1 (No Soreness) to 5 (Severe Soreness)  
* **Stress:** 1 (No Stress) to 5 (Highly Stressed)  
* **Fatigue:** 1 (Fresh/No Fatigue) to 5 (Exhausted)

*(Let me know if you'd prefer Fatigue to be standard, i.e., 5 \= Highly Energized, but usually "Fatigue \= 1" implies low fatigue\!).*

### How to execute this (Task 5\)

We can have OpenCode abstract this into a configuration file so the LogWellnessForm loops through the metrics and automatically applies the correct Tailwind color gradients and text labels based on the current slider value.  
Here is the **Task 5 AI Spec** you can hand directly to the agent to polish up this PWA:

### AI Spec: Task 5 \- Dynamic Slider Polarity & Labels

**1\. Why (Brief Context)**Our subjective wellness sliders currently treat all 1-5 values equally. However, human intuition dictates that a "1" in Sleep is bad (red), but a "1" in Muscle Soreness is good (green). We need to implement dynamic color routing and descriptive text labels based on the "polarity" of each specific metric to match professional sports-science apps.  
**2\. What (Scope)**

* Create a configuration object for the 6 subjective metrics (sleep, diet, mood, muscle\_soreness, stress, fatigue) defining their labels and polarity.  
* Update the LogWellnessForm sliders to dynamically change their Tailwind background color (Red, Orange/Yellow, Green) based on the current value AND the metric's polarity.  
* Display dynamic text labels next to the sliders (e.g., "1/5 \- No Soreness") that update as the user drags the slider.

**3\. Constraints (Boundaries)**

* **Database:** Do NOT alter the database schema or backend tRPC API. The database will continue to store the raw 1-5 integers. This is strictly a frontend UI/UX upgrade.  
* **Polarity Rules:**  
* *Standard (1=Red, 3=Yellow, 5=Green):* Sleep, Diet, Mood  
* *Inverted (1=Green, 3=Yellow, 5=Red):* Muscle Soreness, Stress, Fatigue  
* **Styling:** MUST use standard Tailwind CSS classes for the dynamic colors (e.g., bg-red-500, bg-green-500).

**4\. Tasks (Discrete Work Units)**

* **Task 1 (Config File):** Create src/app/shared/wellnessConfig.ts. Export a configuration array or object that defines each of the 6 metrics, its polarity type ('standard' | 'inverted'), and an array of 5 descriptive labels corresponding to values 1 through 5\.  
* **Task 2 (Dynamic UI):** Update src/app/components/forms/LogWellnessForm.tsx. For each subjective metric slider, use the wellnessConfig to calculate the current color class. Apply this dynamic color to the shadcn/ui Slider's SliderPrimitive.Range (or equivalent track) component. Render the corresponding descriptive text label (e.g., "Fantastic" or "Not Good") next to the slider value.  
* *Verify:* Moving the Sleep slider to 1 turns it red. Moving the Soreness slider to 1 turns it green.

Once OpenCode completes this, your logging screen will look and behave exactly like the Morpheus app. Do you want to go ahead and run this spec?  
