# Emergent Social Simulation — Revision 4.0

**Complete Model, Architecture & Build Specification**

Oct 3, 2026 · @Adib

## Status, authority and how to read this document

**Revision 4.0 is the sole normative authority for the Emergent Social Simulation (ESS).** It is complete and standalone. It supersedes Revision 3.2 and every earlier model revision, every build or execution guide, every intelligence or decision addendum, every architecture report, and every architectural assumption embedded in earlier implementations. Where any older material conflicts with this document, this document governs.

V1 and V2 remain historical implementations only: scientific references, diagnostic archives, test and counterexample libraries, and selective code mines. They carry no normative force. No requirement in this document depends on them, and no omitted rule may be recovered from them. If an implementer holds this document, they need nothing else to know what ESS is, how it must be built, and how it is judged.

### Normative levels

Revision 4.0 separates seven levels of authority so that conveniences cannot harden into apparent law. Each section heading states its dominant level in brackets; a paragraph that departs from its section's level carries its own tag.

| Level | Name | Contains | How it may change |
| --- | --- | --- | --- |
| I | Experimental charter | What ESS investigates; what counts as success or failure of the experiment | Only by redefining the project |
| II | Causal invariants | Distinctions whose removal would change what ESS measures | Only by a new, explicitly named experiment version with written rationale; never for engineering convenience |
| III | Architectural constitution | Organs, ownership, single writers, boundaries, and the general abstractions everything attaches to | By an architecture decision record (§46.4) showing either that a Level I–II requirement cannot otherwise be met, or that the change preserves every Level I–IV contract and measurably improves generality, simplicity or cost, with migration semantics |
| IV | Behavioural contracts | What bounded people must be able to do; which pathologies must not occur | By amending the contract and its tests together |
| V | Experimental model | Scientific laws and parameters; causal policy parameters of bounded cognition; versioned numerical semantics | By versioned configuration; a change inside a running world is a recorded fork |
| VI | Implementation defaults | Engineering choices that do not change causal history | Freely, provided Levels I–V and their tests still hold |
| VII | Non-normative examples | Pseudocode, worked arithmetic, illustrative sketches | Freely; they never bind |

**The governing rule:** an implementation convenience must never be promoted to Level II or III, and no setting capable of changing causal history may be classified as Level VI.

### Conformance language

- **MUST / MUST NOT**: binding at the level of the section.
- **SHOULD**: the default; deviation requires a recorded reason.
- **MAY**: permitted, not required.
- **Provisional**: a value or choice adopted because the experiment needs one, not because it is known to be right. Provisional values are fully resolved for reproducibility, expected to change through measurement, and never reported as findings.

### Parameter classes

Every value that a run needs belongs to exactly one class. The test for classification is behavioural, not a matter of intent: **if changing a value can change the causal event digest under the same seed, it is not engineering.**

| Class | Meaning | Examples |
| --- | --- | --- |
| C: mechanism rule | A cardinality or structural rule that is part of a mechanism's meaning | One conception draw per defined fertility opportunity; one active recognised father in the baseline; one ledger per person |
| S: scientific | Defines the artificial ecology: biology, physiology, ecology, preferences, social laws, cultural endowment, scenario | Learning constant, attraction coefficients, renewal times |
| P: causal policy | Governs bounded cognition and conventions that change who or what is considered, when action starts, or which option wins | Review epoch, effort budgets, agenda sizes, fairness rules, memory limits, horizons, prior strength, bargaining convention, envelope defaults, held error |
| N: numerical semantics | Discretisation and arithmetic choices that can alter history | Timestamp quantum, held-input boundaries, rounding, root tolerance, reduction order, sampler transforms, wake-signature quanta |
| E: engineering | Choices with no effect on the causal digest | Data layout, equivalent caches, display and snapshot rates, checkpoint frequency at valid boundaries |

Classes C, S, P and N are all causal and all versioned. Equations in Parts IV–VIII are written with their V4.0 baseline coefficients for readability; those coefficients are Level V values and are registered in §47. Policy (P) and numerical (N) values are referred to by name in the body and are resolved **only** in §47, the **V4.0 Baseline Reference Profile**. A causal value that a run needs and that §47 does not resolve is a configuration error that halts the run; it is never filled by an implementation default.

### Units and notation

| Symbol | Meaning |
| --- | --- |
| SD | Simulation day: one representative month of biological and social life; 12 SD = 1 year |
| FU | Food unit: quiet food requirement of an ordinary fully developed adult M with efficiency 1 for 1 SD (a stock quantity) |
| FU/SD | A food rate; every food flow in this document is a rate unless written as a stock |
| work-SD | One person's entire SD of a stated activity |
| CU | Cargo unit: stylised bulk, not mass |
| EU | Effort unit of the cognitive effort account (§17) |
| km | Kilometres on the logical map; speeds in km per SD of travel |
| M / F | The two biological classes of this artificial ecology |

clip(x, l, u) = min(u, max(l, x)); \[x\]₊ = max(0, x); σ(x) = 1/(1 + e^−x); GM(x; w) = exp(Σ wⱼ log xⱼ) with Σw = 1; sat(z) = z/(1 + z). Relaxation uses the exact form x′ = x\* + (x − x\*)e^(−Δt/τ). Hazards convert to probabilities as 1 − exp(−∫h dt). τ always denotes an e-folding time, never a half-life or deadline. Ages are in SD unless labelled years. A stochastic U is a semantically keyed uniform draw (§6.4), distinct from inherited potentials U\_B, U\_A, U\_C, U\_P, U\_v.

### Structure

Part I states what the experiment is. Part II is the architectural constitution. Part III defines the person and how a person knows, chooses, explores, plans and acts. Parts IV–VII define the material, biological, social and political laws, including institutions. Part VIII covers long-run evolution, interpretation and observation. Part IX covers computation. Part X states how ESS is extended, staged, proven, validated and built, and how failures are diagnosed. Part XI contains the V4.0 Baseline Reference Profile, the scientific hypotheses under test and a compact summary. Appendix A is a non-normative historical crosswalk.

## Part I — The experiment

### 1. Purpose and experimental charter \[I\]

**ESS is an artificial early-society ecology in which individual capability, material success, exploration and learning, social organisation, power and reproduction are causally linked, so that inequality, hierarchy, culture and selection can emerge across generations instead of being assigned.** It is simultaneously a scientific instrument and a world people can watch and understand.

#### 1.1 The causal chain under study

The experiment exists to let this chain operate, fail, vary and be measured:

```latex
\text{inherited variation} \rightarrow \text{development} \rightarrow \text{mastery and learned methods} \rightarrow \text{realised performance} \rightarrow \text{production, hunting, combat, organisation} \rightarrow \text{resources, followers, territory} \rightarrow \text{hierarchy} \rightarrow \text{mating opportunity} \rightarrow \text{genetic reproduction} \rightarrow \text{selection}
```

Every link must be physically mediated. Capability matters only through what a person actually produces, discovers, defends, organises or controls. Success matters for reproduction only through what others actually observe, the resources and contact it actually creates, and encounters that both parties actually choose. A parallel cultural channel runs alongside the genetic one: methods, knowledge and institutional records are learned, transmitted, lost and rediscovered through real channels.

#### 1.2 The regime the experiment investigates

The intended regime is a hypothesis to be tested, not an outcome to be forced. It combines:

- many ordinary primary households;
- many adult Ms with one bond, and a meaningful population of unpaired and zero-offspring Ms;
- a smaller successful M tail with several associations and disproportionately many genetic children;
- substantial extra-pair reproduction, making genetic siring more concentrated than primary bonding;
- recognised fathers and other caregivers supporting children sired by someone else;
- military command, coercive hierarchy and territorial control becoming overwhelmingly M-centred **through material mechanisms**, with formal sex exclusion from office off by default;
- Fs remaining productive, cognitively capable, propertied, socially consequential and central to development, transmission and inheritance;
- success, its causes and its later collapse varying between worlds.

**Reproductive inequality alone does not pass.** The high-sire tail must be enriched for genuine prior competitive success. An all-unpaired, near-extinct or randomly skewed world is a scientific failure of the regime even if the software is correct. A correct implementation can fail the hypothesis; that result must be reported, not repaired.

#### 1.3 Declared modelling assumptions and baseline asymmetries

The baseline is an artificial ecology with declared asymmetries. They are explicit assumptions, not empirical claims about humans, and every one of them can causally contribute to whatever regime emerges. No resulting pattern may be attributed solely to material competition while any of these assumptions also bears on it. Each is a Level V assumption registered in §47 and varied only by named experiment.

| Assumption | Where | Causal role it can play |
| --- | --- | --- |
| Shared genetic distribution and transmission for M and F | §23 | Symmetric baseline; no sex-specific truncation of potential |
| Class-specific task expression ratios (genes, development and mastery unaffected) | §24.3 | Differential realised output, force and command effectiveness |
| Class maintenance factor (s\_F = 0.85) and carrying factor | §22.1, §20.4 | Different food requirement and cargo capacity |
| Asymmetric attraction functions (success term in F→M only; heavier display weight in M→F) | §30.2 | Links observed success to F choice; display-driven M choice |
| Success-credit eligibility (completed consequential hunts, defence, contested access or control outcomes, exceptional communal relief; not routine production, craft or administration) | §30.3 | Determines which achievements can raise attraction |
| Readiness modelled for F toward a specific M; M willingness through ordinary arbitration | §30.5 | Different encounter dynamics by class |
| Reproductive biology: pregnancy, recovery, fertility curves | §31 | Different reproductive costs and timing |
| Household cardinality: F holds one primary provisioning bond; M has no fixed limit subject to feasible liabilities and assent | §29.1 | Permits polygynous provisioning structures; forbids polyandrous primary bonds |
| Continuity inertia (F full, M 0.35×) and lifetime partner-history cost (F only) | §29.2 | Bond stability and serial-formation friction differ by class |
| Novel-partner cost (F only) | §30.7 | Concentrates F encounters on fewer Ms |
| Optional support and courtship pool (M only, attraction-scaled) | §29.4 | Directs M surplus toward attractive Fs |
| Default provisioning split (60% maternal side, 40% recognised supporting side) | §29.3 | Shapes household liabilities |
| Encounter satiation parameters differ by class | §30.6 | Different marginal value of repeated encounters |
| Stronger class expression for armed command and fighting only | §24.3 | Candidate material route to M-centred coercive leadership |
| No maternal mortality hazard specific to childbirth; pregnancy loss ends a pregnancy, not the mother's life | §22.4, §31.2 | Removes one demographic cost from the baseline |

No reproductive classes, scripted elites, assigned partners, rank-based births, conquest mating rewards, hidden population stabilisers or anti-success penalties are permitted.

#### 1.4 What the experiment must be able to contain

The mature world must be capable of histories involving finite ecology and geography; heterogeneous bodies with condition, fatigue and wounds; inherited variation, childhood development and learned mastery; exploration, experimentation, incomplete knowledge, memory and migration; learning new uses and methods, and transmitting them; goods, tools, capital, storage, transport and construction; specialisation, cooperation, exchange, mentorship and shared assets; households, care, attraction, mating, conception, pregnancy and birth; genetic sire, recognised father and caregiver as distinct roles; death, estates and three inheritance channels; dependency, patronage, coercion and leadership; recognised office and effective power; administration, delegation, institutional records, remittance, territory, military organisation, raids, war, occupation, succession and fragmentation; intergenerational cultural transmission and loss; and long-run selection.

The architecture may change. This ambition does not.

#### 1.5 Two products, one causality

ESS serves two audiences from a single causal core:

1. **The scientist** runs accelerated, headless, multi-seed, multi-generation experiments with exact replay and analyst access to hidden truth.
2. **The observer** watches a readable world of small people living, working, exploring, cooperating and contending, and can understand why each person is doing what they do.

Both see the same history. Presentation never alters causality (§39).

### 2. Emergence doctrine \[I–II\]

**An outcome is emergent when it arises from general mechanisms interacting with circumstances, can fail to arise, and varies across worlds. It is scripted when any rule refers to the outcome itself.** Emergence does not mean society must arise from hunger and two physics rules; ESS may author rich human capabilities, technologies that can exist, and institutional possibilities. It means the realised history is not written in advance.

#### 2.1 What may be authored

- **Human capabilities:** perception, memory, bounded planning, exploratory trial, learning, bodily processes.
- **Physical laws:** movement, extraction, transformation, spoilage, conservation, contest resolution.
- **Biological processes:** inheritance, development, fertility, pregnancy, ageing, mortality.
- **Preferences:** the declared consequence terms of §12 and their parameters, including experienced process value (§22.6).
- **Social possibilities:** proposals, commitments, obligations, recognitions, relation types and institution templates that **can** exist (§26, §34).
- **The space of possible technology:** recipes, items, structures and material properties that the world's laws implement (§21). Which of them any person knows is not authored after founding.
- **Information constraints:** what can be perceived, reported, inferred or never known.
- **Initial conditions:** founders, terrain, resource placement, the founding culture's methods and priors.

#### 2.2 What must emerge

Who succeeds, discovers, leads, reproduces and how much; which methods spread, persist or are lost; which households form and dissolve; which groups, coalitions, offices and institutions exist and how long they last; who specialises in what; where people settle; what is traded and on what terms; who controls which territory; which wars are fought and won; how institutions change and collapse; how inherited factors shift across generations.

#### 2.3 What is forbidden

No rule may:

- give high-status people more reproduction, attraction or conception;
- make good hunters, rich people or office holders leaders or elites by rule;
- make followers obey because a role or title exists;
- make households form, or make them imply exclusivity, reproduction, paternity or ownership;
- advance groups through stages (band → chiefdom → state) or prescribe cities, classes, professions or technological progress;
- grant mates, partners or children for conquest, victory or rank;
- make ownership automatically create control, or titles automatically create power;
- assign successful people followers;
- reward possession of tools, skills, novelty, discoveries, map coverage, titles, rank or offspring count as such;
- adjust abundance, fertility, mortality, discovery or behaviour to hit a population, regime or progress target;
- hide an optimisation objective such as fitness, innovation rate or social welfare anywhere in the engine.

#### 2.4 The outcome-reference test

A rule fails the doctrine if its condition or effect mentions an **analyst outcome category**: rank, status label, wealth percentile, reproductive count, historical stage, "elite", "leader", "innovator" or a named institution's success. Rules may mention physical facts (goods held, force present, delivered obligations, observed performance) and **actor-recognised social facts** (a claim particular people recognise, an office particular people accept, a norm particular people hold). The difference is causal: physical and recognised facts are created and destroyed by ordinary events and can be disputed; analyst labels are only summaries of them and are never inputs to any causal rule.

Laws may resolve outcomes that involve particular persons when those outcomes are causal: which encounter record yields a conception, which M is the genetic sire, which target a contest strikes, who is injured, which transition a succession law records. What no law, service or content entry may do is select a person's goals, intentions or commitments.

#### 2.5 Emergence must be possible, not guaranteed

The architecture must make each causal pathway in §1.1 **reachable and observable**. It must not make any pathway **inevitable**. If the intended regime, cooperation, innovation or a state fails to appear, that is scientific information about the model's assumptions. The response is diagnosis (§46), never a success script.

### 3. Causal invariants \[II\]

**These distinctions define the experiment. Removing or merging any of them changes what ESS measures.** They are enforced by separate records, separate writers and invariant tests, never by convention alone.

#### 3.1 Distinctions that must remain separate

| Domain | Separate causes and records | Conflation to prevent |
| --- | --- | --- |
| Capability | Genotype → development → mastery → task expression → condition, fatigue, wounds, equipment → realised performance | Treating mastery as genetic; potential producing output without practice and body state |
| Knowledge of methods | Authored law space (what the world can do) → personal repertoire (what a person believes they can do) → mastery (how well they do it) | A catalogue entry automatically known to everyone; knowing a method implying skill at it |
| Association | Attraction; positive and harmful experience; readiness; accepted encounter; primary household bond | Bond implying mating, exclusivity or paternity |
| Parenthood | Genetic mother; genetic sire; recognised father; accepted caregivers; care actually delivered | Recognition or inheritance reading the hidden sire |
| Goods | Physical quantity and location; custody; recognised claims; reservations; debts | A claim or debt counted as goods; depositing changing ownership |
| Rights | Physical possibility; social entitlement; the audience that recognises it | Entitlement acting as a physical force field; possession manufacturing consent |
| Politics | Recognised office and its scope; accepted orders; effective force present | A title moving bodies; ownership creating control |
| Institutions | Institution records; the knowledge particular people hold of them; members' actual conduct | Records as global memory; an institution as a collective mind |
| Transmission | Genetic; material; cultural and opportunity | Averaging parental mastery into genes; offices descending as property |
| Truth and belief | World truth; personal observations; reports; dated estimates; analyst display | Planning reading truth; hidden events changing beliefs or wakes |
| Time | Elapsed paid time; reserved future time; forecast time | Refunding sunk time; spending a future harvest before it exists |
| Agency | Choice; authorization; execution; proposal; accepted commitment; delivered performance | A runtime changing what was chosen; a leader deciding for another; a promise counted as delivery |

#### 3.2 Physical invariants

1. **Conservation.** Goods are created only by declared sources (ecological renewal, recipes, carcasses) and destroyed only by declared sinks (consumption, recipe inputs, spoilage, damage). Every transfer is accounted once, whatever its social legitimacy.
2. **Paid time.** Each person's time is a single non-overlapping ledger. Work, travel, care, rest, socialising, teaching, trials and administration all consume it. Elapsed time is never refunded; rest that is not taken earns no recovery.
3. **Locality.** Physical interaction requires co-location within the relevant radius. Goods move only by carrying or transfer at a location.
4. **No borrowing from the future.** Nobody eats a future harvest, uses an unfinished tool, meets someone before arrival, funds an action with a forecast, or acts after death.
5. **Finite opportunity.** Stocks, animals and capacity are finite; simultaneous claims on one stock are settled against that stock once.
6. **Partition invariance.** Computational segmentation of time (extra no-effect events, observation, checkpoints, diagnostic sampling, internal event partitioning) never alters physical or biological history. Genuine changes of activity may.

#### 3.3 Informational invariants

1. **The mind never queries remote truth.** Personal decisions use only perception, memory, own experience, own repertoire, reports and public model knowledge.
2. **Hidden biology stays hidden.** Genotype, developmental integrals, exact mastery, fertility state, conception, true sire and kin class never enter personal knowledge except through observable consequences.
3. **Failure discloses only what is observable,** at the moment and place it is observable.
4. **No oracle by repetition.** Repeated hypothetical requests cannot extract private facts.
5. **End-to-end isolation.** Hidden facts reach a mind through no channel at all: not through notifications, wake timing, task cancellations, reservation releases, succession triggers, identity numbering or random-key sequences (§7.5).

#### 3.4 Agency invariants

1. **Independent assent.** No person's time, goods or body is committed by another without that person's acceptance, except through force actually resolved as force or a contested taking actually executed. Minors act within age-appropriate scopes authorised by an accepted guardian; a guardian authorises a minor's participation but never replaces the minor's body, ledger or task lifecycle.
2. **Consent in reproduction is absolute.** Threats, conquest, dependency, debt and poverty change alternatives; they never bypass consent to an encounter. No contested-transition law ever applies to reproduction.
3. **Normative claims do not act.** A custom, unilateral claim or imposed demand may exist without anyone's assent, but it performs nothing. Acts are performed by persons choosing them, or by force resolved as force.
4. **No central optimiser.** No component maximises a group, household, institutional or social objective on behalf of its members.
5. **Obligations persist.** Accepted responsibilities, especially for dependants, survive attention limits, memory eviction, task abandonment, office-holder turnover and the expiry of unrelated agreements.
6. **Execution follows authorization.** Execution may refine means only inside what the person authorised. A change of meaning returns to the person.

#### 3.5 Experimental invariants

1. **No hidden objective.** Neither fitness, population size, discovery, nor any macro outcome is rewarded or targeted anywhere.
2. **Closed world by default.** No invisible immigrants, refreshed alleles, rescue births, gifted knowledge or mandatory unions. Drift, decline, cultural loss and extinction are legitimate outcomes.
3. **Determinism.** The same version, configuration, seed and certified numerical profile reproduce the same history, regardless of playback speed, inspection or save and resume (§6).
4. **Observation is inert.** Viewing, measuring or tracing never changes causal state or consumes causal randomness.
5. **Deferral is not impossibility.** Computational limits may defer consideration; they never convert "not yet considered" into "impossible", never delete duties and never suppress births or kill people.

## Part II — Architectural constitution

### 4. Generative doctrine \[III\]

**ESS keeps what the world can become rich, and keeps the machinery that generates it small.** Complexity lives in state, causal laws, relationships, affordances, learned knowledge, institutions and history. It does not live in expanding behavioural control flow. The aim is few powerful mechanisms with large generative reach.

#### 4.1 The three homes

Everything authored for ESS lives in exactly one of three homes. Deciding which home a new idea belongs in is the first act of every extension (§41).

| Home | What it is | Examples | May contain | Must never contain |
| --- | --- | --- | --- | --- |
| **Substrate** | General machinery for knowing, choosing, exploring, planning, authorising, paying, doing, continuing, agreeing and recording | Kernel, evidence service, mind (arbiter, agenda, binder, trial generator, effort account), task runtime, social protocol, goods ledger, navigation, content interpreters | General algorithms over typed records, and interpreters for typed content | Branches on the identity of particular goods, recipes, methods, relation types or institutions |
| **Laws** | Typed causal modules with narrow interfaces: inputs, state touched, rates or transitions, observable results, and an estimate adapter over beliefs | Physiology, genetics, development, learning, ecology, material effects, pregnancy, contest, recognition, household lifecycle, succession transitions | Domain-specific mathematics and state machines; resolution of causal outcomes involving persons | Selection of any person's goals, intentions or commitments; forecasts that read hidden truth for a mind |
| **Content** | Immutable declarative data instantiating laws and substrate, written in the typed content algebra (§4.5) | Goods, material kinds and properties, recipes and their trigger signatures, item effects, resource kinds, terrain priors, task-expression tables, method schemas, trial forms, obligation kinds, relation templates, rule sets, procedures, scenarios | Numbers, references, typed declarations, bounded predicates, method decompositions | Callbacks, per-content planners, scoring functions, world queries, unbounded recursion or code that chooses people |

**Content defines types; runs create instances.** Records created during a run are neither content nor substrate. They are causal state with owners: personal methods and technique hypotheses (§13), attempt and precedent summaries (§11), institutional records and adopted procedure versions (§34), norm records held by people, and located information artefacts. Their schemas are content; their instances are world or personal state written by the owning organ. Content is never written during a run.

The substrate is established early, proven on many consumers, and changed only by architecture decision record. Laws are added when the world genuinely needs a new kind of causality. Content is added constantly. Learned and institutional records grow as history unfolds, without any code change.

#### 4.2 Generalise process, preserve meaning

Repeated **process** is shared: reaching a place, acquiring an input, carrying, transferring, working, trying, waiting, resuming after interruption, budgeting, authorising, reserving, agreeing, breaching, recording. Distinct **meaning** is preserved: pregnancy is not manufacturing; childcare is not hired labour; a household is not a spot trade; office is not ownership; a genetic sire is not a recognised father; custody is not ownership; authority is not force; a theft is not a sale.

Two things may share a mechanism when their lifecycle questions are the same: what remains, what is funded, what interrupts it, what survives failure. They need separate laws when their causal consequences differ: who is responsible afterward, what can be refused, what can be inherited, what is hidden, who must be told.

#### 4.3 Earned generality, established early

- **Foundational mechanisms are built first and built general.** Knowing, choosing, exploring, planning persistent projects, authorising, executing, transferring, agreeing and recording institutional state are needed by every later capability. They are established in the first macro stage (§42), proven on several consumers including an independent second person, and not redesigned per capability.
- **Everything else earns its abstraction.** A law schema or content schema is generalised when a second real consumer shows compatible semantics. A new scientific law needs no second consumer; a new shared service does.
- **A registry is not an abstraction.** A registry whose entries carry their own generate, estimate and execute callbacks hides bespoke controllers behind a common name. Content entries are typed data; laws expose causal transitions and estimate adapters, not plans.

#### 4.4 Enforceable rules

1. **No content-identity branches in control.** Generic control code (agenda, binder, trial generator, arbiter, effort account, runtime repair, wake logic) must not branch on the identity or name of a good, recipe, method, relation type, role or institution. It reads typed properties and interprets domain-specific knowledge content (methods, heuristics, norms, procedures) through shared interpreters. Domain-specific **knowledge** is permitted and expected; domain-specific **control** is not. Test: renaming every content entry changes no behaviour.
2. **No law selects purposes.** Laws compute what happens, including outcomes involving particular persons. Only minds choose goals, intentions and commitments.
3. **One persistence mechanism.** Intentions, tasks and projects persist through one runtime and one project record (§15–§16). No capability adds its own continuation, retry or budget state.
4. **One arbiter over typed consequences.** All options are compared by one bounded arbitration process (§12.6). Laws and relation templates contribute typed consequence terms through registered adapters; none adds its own scoring path or chooses a winner.
5. **One information boundary.** All personal knowledge, including personal views of commitments and institutions, enters through the evidence service (§11).
6. **One authorization boundary.** The runtime acts only within explicit authorization envelopes (§16.3).

#### 4.5 The typed content algebra

Content is written in a closed, bounded, typed language. Its interpreter is part of the substrate. The algebra is deliberately small enough that hidden control flow cannot fit inside it.

| Construct | Permitted form |
| --- | --- |
| Records | Typed records with declared fields, units and ranges |
| References | To other content entries by stable content ID; to registered law adapters by adapter ID |
| Constants and tables | Numbers with units; bounded lookup tables; piecewise-linear curves |
| Predicates | Comparisons over declared properties of the bound entities; set membership; conjunction, disjunction and negation; bounded quantifiers over a declared finite local scope (the bound actor's own carried goods, the bound site's contents, the parties of a bound commitment). Maximum predicate size `N.content.maxPredicateNodes` |
| Effects | Declarations that name a registered effect adapter and its typed arguments. Only laws compute effects |
| Method decompositions | A finite, partially ordered list of sub-objectives and operation steps with typed parameters, at most `N.content.maxMethodSteps` steps. Sub-objectives are resolved by the binder under the effort account; a method never calls itself or another method directly |
| Procedures | Method decompositions with role-scoped parameters and due-record triggers (§34.5) |
| Trial forms | Typed templates for candidate trials over perceived properties and known operations (§13.3) |
| Preference features | Declarations that a relation, norm or activity contributes a named typed consequence term computed by a registered preference adapter (§12.6) |

**Forbidden in content:** callbacks or executable code; expressions with loops or unbounded recursion; queries of world registries or of any person's state beyond the declared local scope; priority scripts, scoring functions or utility formulas; references to particular persons; strategy loops of any kind.

Enforcement is mechanical. A content linter rejects forbidden constructs and over-limit entries. Every extension carries a diff test: the change set is inspected for new branches in substrate code, new truth queries, new schedulers or new persistence state. Declarative content that hides control flow counts as code.

#### 4.6 Guarding against over-generalisation

Generality is not the goal; reach per mechanism is. The architecture rejects arbitrary key–value universes without types; "everything is a resource" models that erase bodies, consent or recognition; "everything is a contract" models that erase care, biology, custom or authority; universal symbolic planning over the world; universal social equations or a single social-welfare objective; plugin systems without consumers; deep class hierarchies and indirection without purpose; and any meta-framework more complex than the controllers it replaces.

#### 4.7 The generative-freedom test

The architecture models how people and worlds work, not the current feature list. A future fishing spear, ship, road, money, writing, irrigation, disease, guild, temple, new marriage or inheritance law, firearm or industrial process will need new content and often new laws or state; a few may need a narrow change to a general service. **The promise is that new phenomena normally preserve the ownership of choice, evidence, authorization, time, physical effects and continuation.** The failure the architecture exists to prevent is a new phenomenon that needs a new mind, a new controller, or a new persistence architecture. §41 applies this test explicitly; a passing extension is evidence, not a theorem.

### 5. Architecture overview \[III\]

**ESS has seven organs plus a content registry. Minds decide what to pursue and authorise it; the task runtime carries out what was authorised; the world decides what physically happens; the evidence service decides what each person learns; the social protocol records what people have proposed, accepted, owe and recognise.** No organ performs another's role.

```text
                    content registry (immutable, typed)
                               │ read by all
   ┌──────────── world truth: state + laws + services ◄──────────┐
   │                    │ perceptible facts                     │ operation requests
   │                    ▼                                       │ (within envelopes)
   │            evidence service ──► personal beliefs,         │
   │                    ▲             repertoire, projections   │
   │                    │                    │                  │
   │   delivered        │                    ▼                  │
   │   messages,        │                  mind ──► intention + envelope ──► task runtime
   │   recognitions     │                    │
   │                    │                    ▼ proposals, responses
   └──────────────► social protocol (agreements, obligations, social and institution records)

   presentation and measurement read committed state only; kernel orders, keys and persists all of it
```

Every arrow crosses exactly one boundary. The world reaches minds only as evidence; minds reach the world only through the runtime or through the social protocol, and the protocol reaches other minds only as evidence.

#### 5.1 The organs

| Organ | Owns | Reads | Writes | Must never |
| --- | --- | --- | --- | --- |
| **Kernel** | Clock, event heap and phases, transaction coordinator, storage handles and semantic keys, keyed randomness, checkpoints, causal history, decision-trace channel, effort and work counters | Everything, for ordering and persistence | Schedules, commits, history | Contain domain rules or choose anything |
| **World** | Authoritative state (terrain, regions, sites, storages, items, structures, work-in-progress, bodies, private biology, relations as facts) and the laws and services that change it (navigation, goods ledger, work execution, material effects, physiology, ecology, biology, contest, lifecycle) | Its own state; content | Its own state; raw perceptible facts | Choose what any person does |
| **Evidence service** | Perception sampling, observation and report delivery, beliefs, personal method repertoires and trial outcomes, attempt and precedent summaries, personal projections of commitments and institutions | Facts perceptible to a given person; delivered messages; the person's own experienced state | Each person's beliefs and repertoire | Give a mind anything not perceived, experienced, reported, read or publicly known |
| **Mind** (one per person, identical code) | Drives, agenda, aspirations, deliberation, selected intentions and envelopes, projects' decision state, responses to proposals | Own belief view, own repertoire, own experienced body, own exact local goods and ledger, own personal projections | Decisions: select, retain, abandon, authorise, propose, respond, renew | Import world state, read another mind, branch on content identity, or exceed its effort account |
| **Task runtime** | Tasks, steps, envelope execution state, reservations, paid cursors, suspension and authorised repair | Intention and envelope; the beliefs it was bound with; operation results | Operation requests; task state | Change a person's objective, purpose, counterparty, terms, rights basis, spending or exposure; bargain for anyone |
| **Social protocol** | Proposals and their versions, responses, leases, commitments, obligations, deliveries, breaches, social records of every kind, institution records | Delivered messages, deliveries, relation and institution laws | Commitment, obligation, social and institution records; the due index | Accept for anyone, solve feasibility from private state, or merge minds into a group decision |
| **Presentation and measurement** | Snapshot projection, observer and analyst views, metric reducers, exports | Committed state, events, traces | Nothing causal | Feed back into simulation or consume causal randomness |

The **content registry** is data, not an organ. Laws, interpreters and services read it; nothing writes it during a run.

#### 5.2 Single-writer rules

| State | Only writer |
| --- | --- |
| Goods quantities, custody, backing, reservations of goods, unbacked and disputed claims after any transfer kind | Goods ledger (World) |
| Positions, legs and paid travel | Navigation and movement service (World) |
| Body state, pregnancy, development, mastery | Physiology, biology and learning laws (World) |
| Births, deaths and pedigree | Lifecycle law (World) |
| Beliefs, repertoire, attempt and precedent summaries, personal projections | Evidence service |
| Selected intentions, envelopes, project decision state (frontier, assumptions, renewal) | Mind |
| Tasks, steps, paid cursors, envelope spend | Task runtime |
| Proposals, commitments, obligations, social records, institution records | Social protocol, under relation and institution laws |
| Located information artefacts (later: written records) | Goods ledger for the object; evidence service for what a reader learns from it |

Cross-organ consequences flow as committed facts. Paid participation can teach; delivered food can feed and create attributable experience; an injury can interrupt a task; a birth can create a dependant; a death can open an estate and a vacancy. Each consequence has one owner and an idempotent event identity. The kernel's transaction coordinator sequences commits by phase (§6.3) without containing any domain decision.

#### 5.3 The two loops

**The action loop.** World facts become observations (evidence service) → beliefs and repertoire (mind reads) → a selected intention with an authorization envelope (mind) → a bound task (runtime) → operation requests (world) → physical consequences → new perceptible facts.

**The agreement loop.** A mind proposes an exact version of terms → the protocol carries it through a real channel → the recipient's mind responds to that version → assent from every required party to the same version creates a commitment and its obligations → due obligations appear on each party's agenda → performance happens through ordinary tasks → deliveries and breaches become evidence for those who can observe them.

Institutions add no third loop. Their records are consumed through these two: members learn of records through evidence, act on them through their own minds and runtimes, and change them through protocol transitions (§34).

#### 5.4 Interfaces between organs

&#91;VII\] Illustrative shapes; names are not binding.

```ts
// Mind ← Evidence: an immutable personal view per deliberation; no world handles
interface BeliefView { self: ExactLocalSelf; experienced: BodySignals; places: PlaceBelief[];
  people: TieView[]; repertoire: KnownMethod[]; priors: PriorTables; attempts: AttemptSummary[];
  commitments: CommitmentProjection[]; institutions: InstitutionProjection[]; inbox: ProposalVersion[];
  projects: ProjectState[]; time: Time; revision: number }
// Mind → Runtime / Protocol
type Decision =
  | { kind: 'continue' }
  | { kind: 'select'; intention: Intention; envelope: AuthorizationEnvelope }
  | { kind: 'abandon'; intention: IntentionId; reason: ObservableReason }
  | { kind: 'propose'; proposal: ProposalVersion }
  | { kind: 'respond'; proposal: ProposalId; version: number; answer: 'accept' | 'refuse' | 'defer' | Counter };
// Runtime → World: six operation families (§16.1), each carrying an action basis for transfers
type Operation = Move | Work | Transfer | Attend | Recover | Engage;
// World → Runtime: only what the actor could observe, when they could observe it
type OperationResult = { ok: true; completesAt: Time } | { ok: false; observed: ObservableReason };
```

### 6. Kernel: identity, event time, randomness, persistence and history \[III\]

**The kernel makes every history exactly reproducible and inspectable while knowing nothing about any domain.**

#### 6.1 Identity

The kernel keeps two identity spaces and never confuses them.

- **Storage handles** are dense integers, never reused, used only to address records. They carry no meaning. Their allocation order may depend on anything, so nothing causal may depend on them.
- **Semantic keys** are stable 128-bit hashes of causal lineage. Each entity's key is derived from its kind, the semantic key of its causal parent, and an ordinal local to that parent: a person from their mother's key and her birth ordinal (founders from the scenario index); a work-in-progress from its maker's key and the maker's work ordinal; an item from its work-in-progress; an animal from its habitat and the habitat's spawn ordinal; a proposal from its proposer and the proposer's proposal ordinal; an event from its subject and the subject's event ordinal. Generated geography has spatial keys from the generator.

Because a key depends only on its own causal lineage, creating an unrelated entity elsewhere, including a hidden one, cannot change any other entity's key. Every causal use of identity (random keys, tie-breaking, option canonicalisation, ordering at equal timestamps) uses semantic keys. Minds refer to entities through personal handles assigned in the order that person first perceived or was told of them, so personal views are identical in worlds that differ only in unperceived facts.

Derived indexes (spatial hashes, due-time indexes, method and effect indexes) are rebuilt deterministically after load and are never authoritative.

#### 6.2 Time

- **One causal clock** in SD. 12 SD form one year.
- **Timestamps** are integers in units of the timestamp quantum `N.time.quantum`. This is ordering precision, not a tick loop. Future completions round upward canonically. Times beyond the safe integer range are rejected.
- **No global ticks.** Work consists of sparse events, anchored analytic laws and one staggered representative closure per person per SD (§9).

#### 6.3 The event heap and causal phases

A mutable binary heap orders events by (time, phase, semantic key). Cancellation uses generation tokens with bounded compaction of stale entries. At one timestamp, events settle in this canonical phase order, and the complete boundary is committed before any publication or checkpoint:

1. **Close.** Close elapsed movement, work and contact segments under their held inputs; collect simultaneous claims against the same physical state.
2. **Settle.** Reconcile extraction, deliveries and consumption against finite backing; re-anchor body laws through the ending segment. No new meal or mastery improves past work.
3. **Harm.** Resolve ending engagements, injuries, accrued mortality and pregnancy loss. End the dead and the incapable's future participation truth-side.
4. **Life course.** Births, recovery ends, maturity, representative closures.
5. **Observe.** Deliver observations and messages; attribute completed services and consequential success once; process permitted awareness and recognition events.
6. **Commit.** Complete atomic co-present transactions: transfers, local agreement commits, still-eligible reproductive encounters (rechecking assent, life, adulthood, location, conflicts, kin disposition and biological eligibility).
7. **Fertility.** Resolve due hidden fertility opportunities (§31.1).
8. **Decide.** Filter what each affected person may legitimately learn (§7.5); coalesce wakes; run reviews; process affected obligations, estates, vacancies and repairs; schedule future events.

Same-time competing physical claims are settled by an explicit shared rule (proration or semantic-key symmetric priority), never by insertion order or handles. Events created during settlement enter a later phase or the next representable instant; zero-duration cycles fail or defer explicitly. Death or pregnancy loss at a timestamp precedes birth at the same timestamp. Goods delivered before death remain delivered; survivor-dependent completions do not occur after death.

#### 6.4 Randomness

- **Keyed, not streamed.** Every causal draw is a pure function of (seed, RNG version, semantic domain, semantic keys of the entities and act involved, ordinal). Draws never depend on call order, frame count, wall clock, inspection, iteration order or storage handles.
- **Held outcomes.** An interrupted action keeps its drawn outcome. A retried action with the same semantic identity reuses it. New task IDs, renamed offers or reloads cannot reroll quality, conception, contest or detection.
- **Hazard budgets.** One exponential budget per life and cause (age, starvation) or per process episode (one pregnancy's loss hazard; one pursuit opportunity). Accrued hazard consumes the budget; changed rates preserve the residual.
- **Decision noise** is keyed by (person key, canonical option descriptor, review epoch, forecast block) (§12.9). Canonical option descriptors use semantic keys and content IDs, never handles.
- **Separate cosmetic randomness.** Presentation uses its own non-causal domain.

&#91;VI\] A counter-based generator such as Philox4x32-10 with published reference vectors is recommended. Sampler transforms (normal, gamma, Dirichlet, angular) and rejection ordinals are part of the numerical profile (§6.6).

#### 6.5 Persistence and causal history

- **Live state is mutable** under one owner (the simulation worker). Hot state is never reconstructed from history.
- **Checkpoints are continuation-sufficient causal boundaries.** They are taken only at committed boundaries and contain versions and hashes (model, schema, content, source, RNG, numerical profile), resolved configuration, seed, time and phase, and every live causal record: goods, backing, reservations and leases; analytic anchors and held inputs (never materialised values); paid cursors and representative-interval accumulators; tasks and envelopes with their spend; suspended intentions; project records with frontiers, assumptions, cursors and attempt state; beliefs, repertoires, attempt and precedent summaries; agenda and method fairness cursors; wake-edge states and signatures; held errors; hazard residuals; biological phases and processed markers; pedigree; encounter, bond and measurement snapshots; obligations, social and institution records; work-in-progress with quality state; semantic ordinals; archive links.
- **No causal record exists only in a trace or a view.** Disabling diagnostics never changes what a person does next.
- **Causal history is append-only and compact.** Births, deaths, true parents, recognitions, care, estates, ownership, control and institutional transitions are retained permanently. Routine flows are aggregated. History is never copied on append.
- **Interventions are forks.** Changing a causal value in a running world creates a recorded intervention with its parent checkpoint.
- **Incompatible saves are rejected** or explicitly converted with the changed semantics recorded. Old histories are never relabelled; unknown history is never invented to validate a save.

#### 6.6 Determinism profile

Bit-identical replay is guaranteed within one **certified runtime profile**: engine build, platform class, numerical adapter, RNG version and sampler transforms. All causal transcendental functions route through one versioned numerical adapter; fixed-order or compensated sums are used where many contributions combine; bounded root finders use `N.num.rootTolerance` and `N.num.rootMaxIter`. NaN and infinity never enter state. Wall-clock time never decides a causal outcome. The same certified-scope statement applies to headless runs, browser runs, playback speeds, chunking, inspection and save and restore. Cross-profile replay is a diagnostic; a save resumed under an uncertified profile is an explicit fork.

#### 6.7 The decision trace

Every deliberation writes one compact trace record: wake cause, agenda admitted and deferred, options compared with evidence references and consequence terms, gates applied, the winner, rejected alternatives with reasons, the envelope issued, effort spent. The trace is the diagnostic substrate for every "why did or didn't X happen" question (§46). It is bounded per person and aggregated for analysis. It is never read by any causal organ; turning tracing off leaves the causal event digest unchanged.

### 7. World state, affordances and end-to-end information isolation \[III\]

**The world knows what is possible; a person knows only what they believe is possible. Minds plan over believed affordances; the world validates against authoritative ones. Truth-side validity and personal notification are separate processes, so hidden events can make things physically impossible without ever becoming information.**

#### 7.1 Authoritative world state

| Category | Records |
| --- | --- |
| Geography | Terrain fields, passability and move-cost raster, water and crossings, truth-side regions and portals |
| Ecology | Resource sites with stocks and renewal laws; animal habitats and animals; predator dens |
| Material | Storages and containers, stocks, claims, debts, reservations and leases, items, structures, work-in-progress, material kinds with their perceptible and trial-revealed properties |
| People | Position and motion, body state and analytic anchors, private biology (genotype, developmental integrals, mastery, fertility state, hazard budgets), dispositions |
| Personal causal records | Beliefs, repertoires, attempt and precedent summaries, intentions, envelopes, projects (owned by evidence service, mind and runtime; persisted like world state) |
| Social | Ties, proposals, commitments, obligations, relations (households, parenthood, care), social records of every kind, institution records |
| Reproductive truth | Encounter records with snapshots, hidden fertility phases, pregnancies, true parents, pedigree |

#### 7.2 Affordances

An **affordance** is something that can be done: an operation, a target, and the conditions under which it succeeds.

- **Authoritative affordance:** computed by the relevant law at the moment of execution from true state. It answers "does this actually work now?"
- **Believed affordance:** a dated possibility in a person's beliefs: target identity and location as observed, observed properties with age and uncertainty, the method the person knows for it, and the evidence it rests on. It answers "do I think this would work, and how well?"
- **Provisional believed affordance:** a believed affordance installed by the person's own trial, a demonstration or a transmitted report, marked with its provenance, the contexts in which it has been observed to work, and low confidence until repeated (§13.5).

A believed affordance is never a live handle on its target and cannot be refreshed except by new evidence.

#### 7.3 What minds may use

1. **Exact local self-state:** goods physically carried, own paid-time ledger and reserved future time, own equipped items, the exact terms of own accepted commitments, own experienced body signals (§10.3).
2. **Personal evidence:** observations, own experience, received messages and reports, information read from records the person can access (§11).
3. **Personal repertoire:** the methods, material-property beliefs, technique parameters, heuristics and norms the person holds, each with provenance and confidence. The content catalogue and a person's repertoire are separate: installing a content pack updates no mind (§13.7).
4. **Public model knowledge:** the general laws of the world as members of the culture understand them ("food patches regrow", "stone does not", "spoilage is faster when carried"), containing no fact about this world's current state. Cultural priors (§13.9) are public model knowledge.

Nothing else is available to a mind.

#### 7.4 Validation and failure

The world validates every operation at execution against true state: physical access, stock, capacity, reservation, biological eligibility, assent recorded by the protocol, the operation's action basis (§16.7) and law-specific conditions. On failure it returns only what the actor could observe, at the place and time they could observe it: "the patch is empty" on arrival; "the route is blocked here" at the point of discovery; "the offer was refused" without reasons; "she did not come to the meeting" when the meeting time has passed; a generic experienced unavailability for hidden biological causes, never "she is pregnant" or "you are related".

#### 7.5 End-to-end isolation

The boundary covers outputs, timing and identities as well as reads. The following rules are binding.

1. **Truth-side validity is separate from personal notification.** When a hidden event (a death, a conception, an unseen depletion, a remote theft, a change of office holder) makes a future operation impossible, the world marks the operation invalid truth-side. The affected person's task, intention, personal commitment projection and wake stream are unchanged. The person learns of the impossibility only when a legitimate observable consequence occurs: arrival at an absent partner or empty store, a meeting time passing without the counterparty, a message received, a body sensation.
2. **No hidden-time failures.** A failure reaches a runtime at the moment the actor could perceive it, never at the moment of the hidden cause. Generic failure codes do not conceal timing, so timing is governed separately: an operation scheduled to start later fails when it is attempted, not when it became impossible.
3. **Reservations follow knowledge.** A person's own reserved goods and time stay reserved in their own records until that person observes a reason to release them or a lease expires on its own declared schedule. Truth-side release of a dead or departed party's backing does not release the living counterparty's own reservation and does not wake them.
4. **Exact self-knowledge is local.** Exactness covers what is physically with the person and what they agreed to. A person's claim in a remote store is known as "last known balance at time t", projectable by known spoilage law but not by unseen theft, use or depletion. Another person's availability, performance and remote backing are dated beliefs.
5. **Hidden biology produces no events of its own in minds.** Conception, a fertility opportunity, a hazard crossing that has not yet produced an observable state, a kin-gate refusal, or a pregnancy before recognition never produce wakes, cancellations visible to the counterparty, or protocol notices. Cancelled future encounters invalidate truth-side and are discovered as experienced unavailability when attempted.
6. **Succession and estates start truth-side, become known locally.** A death opens an estate and any vacancy truth-side immediately. Only people who perceive the death, or later receive a report of it, can act on it. Distant office holders, subordinates and creditors learn by message.
7. **Personal topology only.** Route estimates and route planning use only the person's known geography (§8.3), including their own region summaries. The truth-side region graph serves physical execution and perception only.
8. **Estimated self-demand.** Forecasts normalise by the person's experienced estimate of their own quiet requirement, never by the hidden physiological formula (§12.5).
9. **Identity noninterference.** Keys and personal handles follow §6.1, so unrelated hidden entity creation cannot change any choice, tie-break or random draw.
10. **Scheduler opacity.** Minds never read the event queue, future draws or hazard budgets. Wakes derive only from a person's own state, their delivered evidence and their own schedule.
11. **Analyst opacity; no mind reading.** Analyst views, hidden keys and evaluator budgets never enter anything a mind reads. Nobody reads another's preferences, readiness, satiation, thresholds, valuations, repertoire or private commitments.
12. **No validation oracle.** Submitting hypothetical requests to learn private facts is impossible: validation happens only on real attempts, which cost real time.

Legitimate private processing coefficients differ between people: a person's own developed capacity scales their inference noise (§11.4). This is not access to hidden external facts, and isolation tests must distinguish the two.

#### 7.6 Paired hidden-world tests

Isolation is tested with **coupled worlds**: two worlds sharing seed, configuration, the focal person's entire causal personal state and every observation permitted to them, differing only in a hidden fact. Required variations: unseen remote depletion; a remote death of a counterparty or office holder; a hidden conception affecting a future encounter; a remote theft from the person's own claimed store; irrelevant hidden entity creation. Required equalities, until the first perceptible consequence differs: the person's belief view, wake stream (times and causes), agenda admission, candidate set, choices, envelopes and task repairs. A changed local experienced state (hunger the person actually feels) is a legitimate difference, not a failure.

#### 7.7 What the world may compute about a person

The world may use truth to decide what becomes perceptible to someone (line of sight, presence, visibility of an action, audibility), to compute realised outcomes, and to compute private inference noise from a person's own hidden capacity. It may not export the inputs of those computations into personal knowledge.

### 8. Space, personal geography and navigation \[III; values V\]

**Positions are continuous; terrain is a weighted raster; long-distance structure is a region graph built from that raster. Truth-side geometry executes movement; each person plans only over their own known geography.**

#### 8.1 Five representations that must stay separate

| Layer | Owner | Content |
| --- | --- | --- |
| Physical geometry | World | True terrain, passability, move costs, water, crossings, truth-side regions and portals |
| Personal geography | Evidence service, per person | Coverage of seen cells, their observed terrain class and passability, observed blockages, remembered routes, the person's own region summaries |
| Route planning | Task runtime and binder, for a person | Paths and cost estimates over that person's geography only |
| Physical execution | World navigation service | Paid movement along a path, validated against true terrain as it is reached |
| Visual interpolation | Presentation | Drawing positions between authoritative leg anchors |

The renderer never determines causal movement. A route is never computed on truth and then concealed, and a truth-side distance or region connection is never given to a mind.

#### 8.2 Physical geometry

- **Coordinates:** continuous (x, y) in km.
- **Raster:** canonical 256 × 192 cells at 0.10 km (25.6 × 19.2 km). Larger maps are explicit configuration. Each cell carries terrain class, passability, a move-cost factor p\_terrain and line-of-sight properties.
- **Topology:** 8-neighbour with octile distances; no diagonal corner cutting past impassable cells. Paths through known passable terrain are shortened by line-of-sight string pulling.
- **Truth-side regions:** connected passable clusters of a few kilometres joined by portals at fords, passes and bridges, rebuilt when passability changes. They serve execution, perception scheduling and analysis.
- **Terrain change** (structures, roads, flooding, clearing) alters cells through declared laws; affected regions and execution caches are invalidated physically. People learn of changes only through evidence.

#### 8.3 Personal geography and routing

- Each person holds a coverage bitset and the observed class of seen cells (§11.3). It records witnessed area, never world content.
- **Personal region summaries** are built from that person's witnessed or reported connectivity: clusters of known passable cells and the known crossings between them, with known traversal costs. They exist per person (sparse, chunked, shared structurally where identical) and are rebuilt incrementally as coverage grows.
- **Established routes** use A\* restricted to known passable cells, guided by personal region summaries.
- **Exploratory legs** may plan through unseen cells at prior-expected cost with explicit uncertainty; they advance as local visibility establishes geometry and cannot cross real barriers or silently learn a hidden corridor. Discovering a blockage ends the step with an observable failure and updates beliefs.
- **Bounded, resumable work.** Route computation spends from the person's effort account (§17). Exhausting it returns "route not established" with a resumable frontier, never "unreachable" without proof, and never teleports.
- **Planning estimates** use personal region summaries; a full path is computed only for a selected task's next leg. Launch requires an established executable prefix and honest uncertainty about the rest.

#### 8.4 Movement law

Travel speed in a cell is

```latex
v = 80\,A_{travel}\,\sqrt{c}\,\sqrt{1-w}\,(1-0.20d)\;\frac{p_{terrain}}{1 + \text{load}/C_{nom}} \quad \text{km/SD}
```

where A\_travel is the travel task expression (§24.3), c condition, w wounds, d fatigue, and C\_nom nominal cargo capacity (§20.4). Juvenile speed multiplies by √m once. Each factor applies once.

**Held inputs \[N\].** A leg is an anchored law (§9.2). Body inputs (A\_travel, c, w, d) and load are held from the leg's anchor; p\_terrain varies along the path and is integrated exactly cell by cell. The leg re-anchors only at its genuine boundaries: leg start, arrival, interruption, injury, load change, and the person's representative closure. Unrelated events, observer reads, checkpoints and diagnostic sampling never resample speed.

#### 8.5 Perception and contact during movement

Movement is swept, not teleported. The navigation service schedules boundary events when a moving person's sight footprint enters new terrain, comes within sight or contact radius of another entity, or crosses a portal. Perception happens at those boundaries (§11.1). Contact detection uses a spatial hash; there are no all-pairs checks.

#### 8.6 Radii \[S\]

| Interaction | Radius |
| --- | --- |
| Ordinary sight (terrain-occluded) | 0.60 km |
| Sight from an intact staffed outpost | 1.0 km |
| Work, contact, transfer at a site | 0.08 km |
| Individual exchange and intimate interaction | 0.01 km |
| Audible warning | 0.15 km |

#### 8.7 Groups, vehicles, roads and territory in space

- **A group route is a coordination intent, not a merged body.** Members move individually, fed and vulnerable as individuals; presentation may draw formation. A caravan may batch computation but each participant keeps position, time, load, supply, wounds and assent.
- **Vehicles** (a later law) are containers with propulsion and navigability laws. Passengers and crew keep personal ledgers; their positions derive through the carrier chain (§20.5). A walking-speed multiplier is not a vehicle law.
- **Roads and trails** are terrain cost modifiers created by declared laws. Cosmetic trails have no causal effect.
- **Regions** are natural units for settlement analysis, territorial influence, supply routes and military movement (§36–§37).

### 9. Time, events, wakes and canonical temporal settlement \[III; N\]

**Quantities evolve analytically between genuine causal boundaries; reading them never changes them. Minds deliberate only when something they care about has changed. No frame-driven cognition, no full review after each small step, and no skipping genuine causal boundaries for speed.**

#### 9.1 The representative day and canonical closure

One SD is a representative month. Each person has one finite activity ledger per SD; fractions go to rest, work, travel, care, social time, training, trials, watch, maintenance and leisure, summing to at most one. Unused awake time is quiet time. Tasks and journeys may span many days; the closure of a representative interval closes accumulators without resetting tasks.

Each person's **representative interval** runs between consecutive **representative closures**, scheduled at a fixed per-person offset (derived from the person's semantic key) every 1 SD. The first interval runs from birth or founding to the first closure; the last ends at death. Closures are the only commit points for laws whose meaning is defined over a representative allocation of time (fatigue, enjoyment, care and development). They are fixed in advance, independent of what else happens, and therefore invariant to computational partitioning.

#### 9.2 Anchored laws: materialise versus commit

Every analytic law stores an **anchor**: the anchor time, the state at that time, and the held inputs in force since then. Two operations exist and are never confused:

- **Materialise** computes the state at time t from the anchor. It is a pure read: it writes nothing, draws nothing and refreshes nothing. Observer reads, diagnostics, threshold scheduling, other laws' needs, ledger reconciliation and checkpoints use materialisation only. Checkpoints store anchors and held inputs, never materialised values.
- **Commit** re-anchors at a **genuine causal boundary** of that law: a change in its held inputs caused by an actual change of activity, intake, exposure, body state or social contact, or a canonical closure. Commits settle once.

Because only genuine boundaries commit, extra no-effect events, observation, checkpoints, diagnostic sampling and internal event partitioning cannot alter any body, stock, progress or hazard. A genuine change of actual activity may.

#### 9.3 Settlement semantics by law

| Law | Held inputs | Genuine boundaries (commit) | Sufficient accumulators | Commit operation |
| --- | --- | --- | --- | --- |
| Fatigue (§22.5) | Opening d | Representative closure; death | Interval duration; ∫ effort-weighted activity time; ∫ rest time | Fractions = accumulator / interval duration; target d\*; exact relaxation over the interval with τ chosen once by the sign of d\* − d. Performance uses d held from the last closure |
| Enjoyment and process value (§22.6) | Opening f; activity-family satiation and familiarity anchors | Representative closure; death | Duration; ∫ pleasant weight (largest applicable weight per moment); union time of compulsory service, danger or deprivation; per-family pleasant time; exposure counts per semantic descriptor | Compute v and ρ; exact relaxation of f; update family satiation and familiarity |
| Condition (§22.2) | Intake rate, requirement rate from current activity load and modifiers, relaxation direction | Intake start, stop or rate change; activity-load change; pregnancy start or end; recovery start or end; wound change; exposure entry or exit; crossing of 0.35 (hazard region) | Anchor (t₀, c₀) | Exact relaxation toward C(n); re-anchor |
| Food consumption | Stream rate from a reserved lot | As for condition; lot exhaustion | Consumed since anchor | Ledger debit exactly once |
| Movement (§8.4) | Body inputs and load at leg anchor; path | Leg start; arrival; interruption; injury; load change; representative closure | Anchor position along path | Re-anchor |
| Work progress (§16.6) | Rates at segment start (competence, condition, fatigue, tool, site stock, cargo space) | Segment start or end; depletion; cargo full; interruption; injury; representative closure; analytic depletion solution | Paid-through cursor | Settle the paid prefix once |
| Learning (§24.2) | Λ held over the segment | Work segment end; interruption; representative closure | Practice time per domain in the segment | Closed-form update 1/(1 − x′) = 1/(1 − x) + ΛΔ; affects later work only |
| Care and development (§23.2) | Child's interval accumulators | Child's representative closure; age 72 SD; maturity 216 SD; death | ∫ care-quality time per child; ∫ intake; ∫ requirement; ∫ forced flight or attack time; ∫ positive interaction | Compute N, C\_care, S, X\_exp for the closed interval; add w\_s E\_s Δ to each integral |
| Hazards | Rate as a function of the law's anchored state | Any re-anchor of the inputs | Integrated hazard since anchor; residual budget | Consume budget; schedule the next crossing analytically, through both entry into and recovery out of threshold regions |
| Readiness (§30.5) | λ, μ | Contact start or end; service events; eligibility change; representative closure | Anchor | Exact relaxation; analytic threshold crossing |
| Resource stock (§19.2) | Renewal law; extraction demand | Extraction start, stop or change; depletion | Anchor | Joint renewal–extraction solution; depletion event |
| Spoilage (§20.3) | Storage kind | Transfer; storage kind change; integrity threshold | Anchor | Re-anchor |
| Tie experience b, h, π (§25) | Decay | Attributed events | Anchor | Lazy decay then update |

The rules this table protects: no refunded work; no benefit from cancelled rest; no retroactive mastery; no backdated food or care; exactly-once settlement; hazard integration through both entry and recovery regions; and identical results under any computational partitioning.

#### 9.4 Event sources

Events arise from: operation completions; leg boundaries and sight-footprint changes; analytic threshold crossings; contacts and arrivals; deliveries and messages; due obligations, lease expiries and appointment times; biological schedules (fertility opportunities, recognition, birth, maturity, death); ecological schedules; representative closures; review epochs and project renewal times.

#### 9.5 Threshold events are edge-triggered

Physiology and other laws schedule the analytic moment a person's projected state crosses a declared threshold: carried food running out at current intake, rest debt exceeding a level, a dependant's coverage becoming unmet, readiness crossing an acceptance level. Each threshold has a **fire level** and a **re-arm level** (`P.wake.thresholds`). It fires once on crossing and re-arms only after the state recrosses its re-arm level. An already-crossed threshold can never create a review loop.

#### 9.6 Three tiers of mind activation

| Tier | Trigger | Work done | Who does it |
| --- | --- | --- | --- |
| **Continue** | A step completes and the task remains valid in its envelope | Advance to the next authorised step; no option comparison | Task runtime |
| **Repair** | A step fails or a dependency changes, and an equivalent authorised means exists inside the envelope (§16.4) | Deterministic cheap substitution among authorised means | Task runtime |
| **Reconsider** | A wake cause below, or a repair that would change a meaningful trade-off | Full deliberation (§12.4) under the effort account | Mind |

**Wake causes:** the intention completes; it fails and cannot be repaired inside its envelope; a safety interrupt (new threat evidence, injury, an urgent threshold); salient new evidence whose estimated value change exceeds `P.wake.salience`; an actionable proposal version or a due obligation that conflicts with the current intention; a project renewal or reopening condition; the periodic review epoch `P.attn.reviewEpoch`, staggered per person.

Wake discipline (coalescing, signatures, caps and safety handling) is specified in §17.5.

#### 9.7 Interval execution

An operation runs until its next genuine boundary: completion, depletion, cargo full, a threshold crossing, a contact, an interruption, or a representative closure. Long work is not chopped into fixed chunks. Skipping contacts, contention or danger to save events is never permitted.

#### 9.8 Presentation time

Playback speed, pausing and inspection are presentation only \[VI\]. The default pace is about 15 real seconds per SD at 1×. At high speed presentation may simplify off-screen animation; it never skips causal events or alters results.

## Part III — The person

### 10. The person: body, biology, dispositions, mind and self-knowledge \[II–III; values V\]

**A person is a body with hidden biology, a history of practice, a repertoire of learned methods, three baseline dispositions and one mind. Every person runs identical cognitive code; individuality comes from biology, history, evidence, learned content, relationships, possessions and place, never from behavioural classes.**

#### 10.1 Components

| Component | Contents | Visible to the person's own mind |
| --- | --- | --- |
| Identity | Semantic key, class M or F, birth time, alive state, true parents (private) | Own class, age, known mother, recognised father |
| Inherited biology | Seven diploid factors, display and preference markers (§23) | No |
| Development | Physical and mental exposure integrals, frozen at adulthood (§23) | No |
| Mastery | Five learned masteries x\_k (§24) | No exact values; own practice history and experienced rates |
| Repertoire | Known methods, material-property beliefs, technique parameters, heuristics and norms, each with provenance and confidence (§13, §24.7) | Yes: this is what the person knows how to do |
| Body | Condition c, wounds w, rest debt d, enjoyment f, activity-family satiation and familiarity, pregnancy and recovery state, hazard budgets | Experienced state: hunger and intake, tiredness, enjoyment, wounds, approximate condition, own satiation and familiarity; never hazard budgets; pregnancy only after recognition (§31.3) |
| Dispositions | Patience p, risk tolerance rT, relational concern aT, each in \[−1, 1\] | Yes, as preferences |
| Location and local goods | Position, current leg, carried storage, equipped items | Exact |
| Commitments and claims | Accepted terms, obligations, recognised claims, roles | Exact own terms; dated beliefs about remote backing and others' performance |
| Mind | Beliefs, drives, aspirations, agenda, intentions, envelopes, projects | Itself |

#### 10.2 Dispositions \[V\]

The baseline uses three dispositions, drawn independently and uniformly from \[−1, 1\] at birth or founding, immutable and not heritable. These are baseline scientific choices, not a constitutional limit on psychology; a variant may add heritability or change, and no catalogue of temperament traits is added by default.

- **Patience** sets the personal discount time τᵢ = 24 × 2^p SD (range 12–48 SD).
- **Risk tolerance** sets the severe-risk ceiling (§12.7).
- **Relational concern** weights dependant and relationship terms by ωᵢ = 1 + 0.5 aT.

Dispositions change preferences over consequences. They never create resources, safety, consent or knowledge. Explorer, trader, leader or rebel temperaments do not exist; such differences arise from biology, history, learned content and circumstance.

#### 10.3 Self-knowledge \[II\]

- **Exact local self:** goods physically carried, equipped items, the own paid-time ledger and reserved future time, the exact terms of own accepted commitments.
- **Experienced body:** felt hunger and intake, tiredness, enjoyment, satiation, wounds; condition approximately. Hazard budgets never.
- **Own rates:** for each task kind a context-labelled estimate of own effective rate, starting from the public ordinary prior and updated from actual paid performance corrected for observed context. A founder's supplied practice history is known as practice, not as genotype.
- **Own quiet requirement:** an experienced estimate F̂\_quiet of own maintenance need, from the public prior and the person's own intake and condition experience. Forecasts normalise by this estimate (§12.5).
- **Own preferences:** own attraction, readiness, satiation and process enjoyment are known to their owner; others' are not.
- **Remote own interests:** claims in remote stores, the progress of others' deliveries, the state of a distant cache are dated beliefs (§7.5).
- **Never known directly:** genotype, potentials, developmental integrals, exact mastery, the developmental nutrition target, fertility phase, an unrecognised conception, true kin class.

**Inference capacity is private.** A person's developed cognitive capacity and relevant mastery scale their inference noise (§11.4) inside the evidence service. Capability improves precision, not access.

#### 10.4 Sources of individuality

People differ because of inherited factors; childhood food, care and exposure; practice history and mastery; learned methods and transmitted culture; body state; dispositions; personal evidence, priors and memories; ties and reputation; commitments and dependants; possessions and tools; and location. These differences must produce different choices under identical circumstances without any code path that checks who a person is.

#### 10.5 Life course

Persons are born (§31), develop through childhood with age-gated participation (§23–§24), become adults at 216 SD (18 years), and die from starvation, injury or combat, or age hazard (§22.4). Pregnancy loss ends a pregnancy; it is not a cause of the mother's death. At death, activity ends, the person's own reservations end truth-side, goods remain where they are, and care, estate and succession processes open (§32, §35). The record moves to the compact archive; pedigree and consequential history persist permanently.

### 11. Evidence, perception, belief, memory and historical learning \[III; values V\]

**Everything a person knows about the world enters as a dated, attributed evidence record and is held as an estimate with uncertainty. Absence is evidence only in proportion to the search that produced it. The same schema serves places, resources, routes, people, threats, techniques, commitments, institutions and reports.**

#### 11.1 Perception and detection

- **When:** at movement boundaries (§8.5), on arrival, at step boundaries, at contact events, when an action occurs within sight, and at the outcome of every trial and work segment. Never per frame.
- **What:** the world determines what is perceptible from position, terrain occlusion, radius, the observer's paid attention and the entity's detectability. The evidence service samples observations with noise.
- **Detection effort.** Every observation of a place records a **survey footprint**: the cells covered, the duration, and the detection probability achieved per cell, p\_det = clip(0.95 − 0.75 (r/0.60)², 0.20, 0.95) × occlusion factor for range r km, raised by the Field term of §19.4 for deliberate search. Absence of a site is recorded only with this footprint.
- **Bounded attention:** routine observations are limited per person per SD (`P.mem.routineObservations`), selected by relevance, proximity and a stable keyed sample. Consequential events directed at the person (an attack, a proposal, a delivery, an injury nearby) are always perceived.
- **Absence is distinct from non-observation.** Seeing an empty patch records zero stock at that time; not having looked records nothing.

#### 11.2 The evidence record

```ts
type Evidence = {
  owner: PersonKey; subject: EntityRef | KindRef; property: PropertyKey; value: ValueOrCategory;
  observedAt: Time; receivedAt: Time; modality: 'direct' | 'self' | 'trial' | 'report' | 'record' | 'inference';
  provenance: OriginalObservationKey; context: ContextDescriptor; footprint?: SurveyFootprint;
  reliability: number; uncertainty: number; volatilityClass: VolatilityClass; version: number;
};
```

A forwarded report keeps its original provenance and observation time. Ten retellings of one hunt are one observation and one success-credit event.

#### 11.3 What beliefs contain

| Store | Contents |
| --- | --- |
| Map | Coverage bitset with best detection achieved per cell; observed terrain class and passability; observed blockages; personal region summaries |
| Places | Dated records of sites, storages, structures, work-in-progress, refuges, settlements and threats, each with separate beliefs about **existence**, **current stock**, **access** and **social availability** |
| People | Ties (§25) |
| Self | Own rate estimates, practice history, body signals, own quiet-requirement estimate; exact local goods, time and terms |
| Repertoire | Known methods, material-property beliefs, technique parameters, heuristics and norms with provenance and confidence (§13, §24.7) |
| Priors | Occupancy priors per (terrain class, resource kind); trial-outcome priors; social response priors per (setting, kind of proposal, counterparty class) |
| Routes | Remembered paths with status: established, blocked, deferred, unknown |
| Attempts and precedent | Compact semantic attempt summaries and durable precedent (§11.6) |
| Social and institutional | Own commitments and their history; claims, offices, norms and institutional records the person knows or recognises |

#### 11.4 Estimation \[V\]

- **Observation noise.** Interpersonal and capability observations use lognormal noise with log SD 0.35 / max(0.25, √(X\_C K\_relevant)), with K\_relevant = Social for people and Field for ecology. Categorical facts are not noised; angles use wrapped noise. Exact own stocks and paid time receive no noise.
- **Combining samples.** Independent samples combine in log space with weight exp(−age / 3 SD) / variance; the prior counts as one sample; repeated provenance contributes only its latest version.
- **Occupancy inference.** For each (terrain class, resource kind), site density λ (sites/km²) has a Gamma prior with shape α₀ = λ\_cult A₀ and rate β₀ = A₀, where λ\_cult is the cultural prior density and A₀ is `P.prior.strengthArea` km² of equivalent evidence. A survey adds **effective area** a\_eff = Σ cell area × (p\_det,new − p\_det,previous)₊ over its footprint, where p\_det,previous is the best detection already achieved on that cell for that property. Overlapping passes therefore add nothing beyond improved detection. Discovering k new sites updates (α, β) to (α + k, β + a\_eff). The unseen-cell probability of holding a site is 1 − exp(−λ̂ × cell area).
- **Existence versus stock.** Existence of a fixed site is a durable belief. Stock at a known site is a dynamic belief, projected by the publicly known renewal law minus known withdrawals, with uncertainty that widens according to its volatility class and with unobserved competition. An empty harvest updates stock, not existence. Depletion is never read as geological absence.
- **Volatility-aware reopening.** Each belief carries a volatility class (fixed: geology, terrain; slow: wood, stores; fast: food stock, animal presence, social availability). Dynamic beliefs widen with time at their class rate (§47); fixed negative facts never regain optimism by timer. Questions reopen through new evidence, changed context, a new method, or the widening of a genuinely dynamic belief.
- **Reports.** A report's precision is multiplied by the source's reliability (1 + verified correct) / (2 + verified checked), counts decaying with τ = 12 SD; unknown reliability is 0.5; only personally verifiable evidence updates reliability. Contradictory reports coexist until evidence resolves them.
- **Hazards.** A local hazard estimate is (1 + observed incidents) / (prior exposure + exposed SD), with prior exposure 1 / prior hazard from the scenario's terrain danger prior. Unknown safety is never certainty of safety; an unknown opponent is assumed to have at least ordinary prior force with high uncertainty.
- **Contextual social inference.** Response priors are Beta(`P.prior.contactResponse`) per (setting, proposal kind, counterparty class), updated only by distinct observed attempts. One refusal updates that context; it never creates global social pessimism.

#### 11.5 Censored and classified outcomes

Every attempt outcome is classified before it updates anything, and it updates only the matching belief:

| Outcome class | Updates |
| --- | --- |
| No detection despite adequate search | Occupancy posterior for the surveyed area |
| Inadequate detection (short, occluded, interrupted) | Coverage only, at the detection actually achieved |
| Depletion or competition at a known site | Stock belief only |
| Inaccessible route | Route and access beliefs only |
| Execution failure (interruption, injury, tool failure) | Nothing about the target; the attempt remains open |
| Bad technique (outcome below the method's believed yield in this context) | Method confidence in this context |
| Recipient unavailable | Availability belief, time-limited |
| Refusal of these terms | Response prior for this context and term class |
| Promising anomaly (outcome better or different than predicted beyond `P.trial.anomalyThreshold`) | Flags an anomaly record that becomes a trial source (§13.3) |

Interrupted and unresolved outcomes are censored: they keep their status and never count as negative evidence.

#### 11.6 Memory, precedent and forgetting

- **Discretionary memory** is bounded (`P.mem.places`, `P.mem.ties`, `P.mem.attempts`), allocated by salience: relevance to current objectives, recency and use.
- **Pinned records are never evicted:** targets of current intentions and projects; active commitments, obligations, liabilities and disputes; dependants and carers; durable reproductive history; recognised claims, offices and institutional records the person holds or serves; methods currently in use.
- **Posteriors and coverage are not evicted.** Forgetting a particular empty place leaves its contribution in the occupancy posterior and the coverage bitset, so eviction cannot recreate the same optimism.
- **Durable precedent.** When a consequential record is evicted, a compact summary survives: for attempts, the semantic attempt descriptor, outcome class, count and last time; for people, accumulated b, h and π; for regions, coarse negative-survey summaries. Precedent is causal state, saved and restored.
- **Pinned-state cost is accounted.** Pinned records count against the person's processing; a person with many duties genuinely has less attention. Pinning never deletes; if pinned state exceeds technical limits, the run pauses with a checkpoint.
- Forgetting removes beliefs, never obligations, claims or physical facts.

#### 11.7 Reports, records and communication

Reports require co-presence or a messenger who physically carries them (§36.1). Ordinary reports and incidents have relevance lifetimes (`P.mem.reportLifetime`, `P.mem.incidentLifetime`) unless pinned by a live dispute or obligation. Expiry removes freshness, not accountability. Issuing, relaying, listening and reading consume real time. Repeated invitations or renamed offers are not new evidence.

#### 11.8 Versions, invalidation and purity

Every belief has a version. A task records the belief versions it was bound with (§16.2); only a change in those beliefs can invalidate its estimate. Hidden remote change never does: it can only make execution fail, which then produces evidence (§7.5). Reading beliefs is pure: it never refreshes timestamps, draws randomness, advances readiness or updates reliability.

### 12. Drives, objectives, cognitive content and typed arbitration \[III–IV; preferences V\]

**Drives and aspirations turn bodily, social and material state into objectives; a bounded binder expresses objectives through the person's own repertoire; one arbiter compares the resulting options, through explicit gates and typed consequences, against continuing what the person is already doing.** The same cycle handles hunger, tools, trials, trade, care, courtship, office and war. A new activity adds content or law, not a new mind.

#### 12.1 Drives and aspirations

Drives are state-derived urgencies. They do not select actions; they decide which objectives deserve attention now.

| Drive | Source state | Typical objective |
| --- | --- | --- |
| Nourishment | Projected own food coverage over the near horizon | Have food; consume |
| Rest | Rest debt d | Recover |
| Enjoyment | Enjoyment deficit (1 − f)² and own satiation state | Leisure, voluntary social time, engaging discretionary activity |
| Safety and healing | Perceived threat; wounds | Flee, shelter, defend; recover |
| Dependants | Coverage of recognised dependants | Deliver food or care |
| Obligations | Due accepted obligations | Fulfil, renegotiate or breach explicitly |
| Association | Own attraction and readiness | Contact; propose or accept an encounter or bond |
| Livelihood (standing) | Quality and fragility of known options | Improve or secure material access |
| Capability (standing) | Service-use summary and repertoire | Acquire capital, skill or method (§14) |
| Relationships (standing) | Valued ties and their decay | Maintain contact, reciprocate |
| Projects | Retained project frontiers (§15) | Advance or renew |

**Aspirations** are revisable desired services or conditions grounded in experience, observation of others, communicated examples or explicit preference: "have what that person's tool gives them", "a store like the one by the river", "a better place than this valley". An aspiration names a desired service, not a means. It enters the agenda as a standing objective, is nominated from witnessed services that the person lacks (§13.8), persists while evidence keeps it plausible, and decays otherwise. It is never an order to advance history.

Standing drives and aspirations are always present at low urgency. They are the source of non-crisis initiative (§17.2).

#### 12.2 Objectives

An objective is a typed desired state: have(good, quantity, place); at(place); delivered(good or care, recipient); recovered; enjoyed; safe; knows(question); tried(trial descriptor); learned(method or property); fulfilled(obligation); related(proposal outcome); milestone(project); service(desired service class). Objectives never name behaviours. "Increase fitness", "become an elite" and "advance society" are not expressible objectives.

#### 12.3 Methods and cognitive content

A **method** is a typed means pattern composed from the six operation families (§16.1): obtain, deliver, make, investigate, try, recover, practise, contact, propose, engage, maintain, relocate. Method schemas are content (§4.5). A person's **known methods** are personal records instantiating schemas, each with provenance (founding culture, own trial, demonstration, teaching, report, record), confidence, the contexts in which it has worked, and believed parameters (yield, inputs, duration).

People may hold domain-specific knowledge of any kind: methods, material-property beliefs, technique parameters, heuristics, social norms, bargaining habits, hunting strategies, administrative procedures. All of it is typed content interpreted by the same machinery:

- **Methods and procedures** are expanded by the one binder (§15).
- **Heuristics** are typed feature weights or orderings consumed by the shared agenda pre-scorer and the method cursor (§17.2). Two people with different taught heuristics search differently with identical interpreter code.
- **Norms** are typed restrictions or transition costs consumed by the arbiter's gates or consequence terms (§12.6), held by the particular people who hold them.
- **Material-property beliefs** feed binding and trial generation (§13.3).

What is forbidden is control code that branches on which domain it is in. The same mind can contain different learned content, and therefore different expertise.

#### 12.4 The deliberation cycle

```text
on reconsideration wake (§9.6):
    open the review's effort account (§17.1)
    integrate pending evidence and personal consequences
    if a safety cause: run the bounded safety branch (§17.5); commit a reflex intention if warranted; return
    reference := continue the current authorised remaining work with all live obligations (§12.6)
    agenda    := mandatory items ∪ urgent drives ∪ actionable proposal versions ∪ project dependencies
                 ∪ fairness-cursor item ∪ trial candidates (§13.3)          // indexed, bounded (§17.2)
    options   := [reference] ∪ bind(agenda)                                  // repertoire and beliefs only (§15)
    for each option: estimate typed consequences over a common horizon with completion tails (§12.8)
    arbitrate: gates → commitment semantics → severe-risk policy → preference aggregation → incumbent margin
    commit: intention + authorization envelope to the runtime; update project state; write the trace
```

Every step spends from the one effort account. Exhaustion ends the review with what has been compared; unexamined items are recorded as deferred, never as impossible.

#### 12.5 Typed consequences and the preference model \[V\]

An option's forecast produces a **typed consequence vector** relative to the continuation reference π₀: dated material service, dependant coverage, enjoyment and process value, relationship experience, encounter value, one-off transition and friction costs, severe-risk probability, commitments affected, and assent required. Preference adapters registered by laws and relation templates return typed terms; none returns a winning action.

The baseline preference aggregation, over elapsed forecast time t:

```latex
V_i(\pi;\pi_0)=\int_0^{H} e^{-t/\tau_i}\Big[\tfrac{\Delta\dot F_{usable}-\Delta\dot L_{material}}{\hat F^{ref}_i}+\omega_i\beta_D\,\Delta D-\beta_f\,\Delta(1-f)^2+\omega_i\beta_b\,\Delta B_{rel}\Big]dt+T_i+\Delta V_R-C_{oneoff}
```

- **Units.** ΔḞ and ΔL̇ are food-equivalent rates in FU/SD. F̂\_ref = F̂\_quiet × 1 SD is a stock in FU, the person's experienced estimate of their own quiet requirement for one SD (§10.3), held within the review. The bracket is therefore per SD, and its integral over SD is dimensionless utility.
- **Material service** counts useful acquired output and access once, net of consumption, inputs, delivered support, spoilage, expected loss and upkeep. Moving or depositing existing stock is not income. Nonfood goods are valued only through feasible services or an evidenced accepted exchange; there is no resale value without a known buyer or use and no terminal liquidation value.
- **Dependant coverage** D counts at most one unit per dependant per SD: dₖ = min(1, food coverage, care coverage), with the care component equal to 1 when required care is zero. Its integral is in dependant-SD. An unconceived child contributes zero; a recognised pregnancy contributes only from its expected live birth (§31.3).
- **Enjoyment** values relief of the deficit (1 − f)², with f forecast through the enjoyment law including process value (§22.6).
- **Relationship** B\_rel = b − h of one principal tie named by the option's purpose before scoring; there is no search across ties for bonuses.
- **T\_i** is the completion tail (§15.6), using the same terms beyond the explicit horizon.
- **Encounter value** ΔV\_R = β\_R Σ p\_e A\_ie m\_R,i over expected completed encounters, using the actor's own pre-encounter satiation (§30.6).
- **One-off costs** include declared transition frictions (household, §29.2; novel partner, §30.7; norm transitions where a norm law exists) and upfront costs not already in the flows.

Defaults: β\_R = 1.5 per attraction-weighted encounter; β\_D = 0.50 per dependant-SD; β\_f = 0.8 per SD; β\_b = 0.15 per SD; τᵢ and ωᵢ from §10.2.

**There is no reward for information, capital, novelty, discovery, titles, rank or offspring.** Information, capital and learning matter only as expected changes in these same terms (§13–§14). Experienced process value is part of enjoyment, governed by one law for all discretionary activity (§22.6).

#### 12.6 Typed arbitration

One arbiter decides, in this order:

1. **Feasibility gates.** Options requiring overlapping time, unbacked near-term goods, inaccessible believed backing, age-ineligible tasks, or a forecast to fund itself are inadmissible. Gates use personal estimates; a truth-side rejection discovered later is evidence, not a retroactive gate.
2. **Assent constraints.** An option that needs another person's act needs that person's assent, obtained only through a proposal they answer (§26). Assent is not a consequence term and cannot be outweighed by any payoff. Reproductive consent is absolute. Contested taking (§16.7) is admissible only as itself, with its own consequences; it never counts as assent.
3. **Commitment semantics.** The reference contains all live obligations. A due obligation constrains plans by its semantics: an option that would fail it is admissible only as an explicit breach option, carrying the declared breach consequences estimated from the person's evidence (lost reliability with the beneficiary, foreseeable sanctions, norm transition costs where held, and the beneficiary's unmet need where the person values it through β\_D or B\_rel). Breaching never erases the beneficiary's claim or need. A norm a person holds as inviolable removes options from that person's consideration; this is a subjective restriction in their repertoire, distinct from engine impossibility.
4. **Severe-risk policy** (§12.7).
5. **Preference aggregation** over the typed consequence vector (§12.5).
6. **Incumbent margin.** The reference is kept unless an admissible alternative's net advantage exceeds `P.choice.incumbentMargin`. Household transitions use their own comparison (§29.2) in place of the margin.

Physical constraints, consent and independent refusal are never purchasable penalties. Estimation error can make a person choose badly; it can never make an inadmissible option admissible.

#### 12.7 Risk and emergency choice \[V\]

An option's estimated probability of severe harm (own or dependants' starvation, dangerous travel or attack) over 3 SD must not exceed p₃ = 0.12 + 0.06 rT; for other durations compare the equivalent hazard rate −ln(1 − p₃)/3, not the same probability at every horizon. Branches are not double counted. Care deficits affect development; they carry no invented independent mortality hazard.

If the reference breaches the ceiling and an alternative passes, choose among passing alternatives without the incumbent margin. If none passes, choose among physically executable responses by lowest estimated severe harm, then other consequences. A guaranteed safe return is not required when none exists and staying is worse; an emergency inquiry or trial states its uncertainty and cannot spend food that does not exist. Having no safe option is a possible state.

#### 12.8 Forecasting

- **Belief-only.** Forecasts use own rate estimates, beliefs, repertoire, known commitments and public model knowledge. They never run the world forward and never simulate other minds.
- **Paired and shared.** The reference and all options are forecast from one belief snapshot with shared estimates for shared premises, so common uncertainty cannot favour whichever is evaluated later.
- **Common comparison horizon.** All options in one comparison use the longest explicit horizon class among them (`P.forecast.horizons`: routine, investment and recurring, strategic), and shorter options are extended by their own feasible continuation. Beyond the explicit horizon every option, including the reference, carries a completion tail (§15.6). No payoff is structurally zeroed because it lies beyond a horizon; discounting, risk and funding may still make it lose.
- **Coarse and bounded.** A forecast uses `N.forecast.blocks` held-input blocks with meaningful boundaries (completion, birth, maturity) inserted. Near-term timing and backing are exact; distant uncertainty is coarsened explicitly.
- **No future funding.** Near-term feasibility requires actual accessible goods or delivered commitments.

#### 12.9 Fallibility and stability

- **Held error.** Each option's forecast receives one keyed zero-mean error per forecast block with σ\_b = `P.choice.heldErrorScale` × (Δt\_b / SD) × (1 + a\_b / (3 SD + a\_b)) / max(0.25, √(X\_C K\_relevant)), where a\_b is the age of the evidence used (twice the base when none). Tail terms use twice the scale. The key is (person key, canonical option descriptor, review epoch, block) (§6.4), so re-evaluation within an epoch reuses the draw. Common consequences share draws. Error is applied once to changed consequences, not to every accounting line.
- **Hysteresis has exactly three sources:** actual switching costs, the retained intention as reference, and the incumbent margin. Sunk cost is never a reason to continue.
- **Mistakes are real.** Error, stale evidence, bounded attention and coarse forecasts make people choose worse options sometimes. No separate action lottery or temperature is added. Interruptions, retries, renamed offers, reloads and inspection cannot reroll a comparison; contextual negative evidence and authorization spend persist across reviews, so repeated reviews are not unlimited optimism tickets.

#### 12.10 Why this combination

The cycle uses utility arbitration with explicit gates for comparison; persistent bounded means–ends refinement over learned methods for multi-step aims; BDI-style retained intentions for persistence; an RTS-style authorised task runtime for execution; and a small typed trial grammar for exploration. It rejects unrestricted goal-oriented search, authored behaviour trees or task hierarchies per domain, future-world rollouts, recursive modelling of other minds and language-model agents.

### 13. Exploratory agency, inquiry and repertoire growth \[III–IV; values V\]

**Exploratory agency is a general capacity to undertake bounded uncertain activity and to learn new affordances from its consequences. Instrumental inquiry is one use of that capacity, not its definition.** A person may try something whose useful result is not represented anywhere in their repertoire. Selection is justified by their current beliefs, declared preferences and affordable exposure, never by hidden eventual benefit. Real outcomes can change both estimates and the repertoire itself. Exploration uses the one arbiter and the one task runtime; there is no exploration executive, no novelty score, no quota and no hidden recipe oracle.

#### 13.1 One capacity, several uses

| Use | Entry reason | Evaluation and result |
| --- | --- | --- |
| Exploitation | A known service is useful | Ordinary consequence estimate; incidental observations still arrive and can flag anomalies |
| Instrumental inquiry | An uncertainty could change a represented choice | Bounded expected value of sample information (§13.10), net of inquiry and adoption costs |
| Experimentation | A reachable operation or combination has uncertain effects | A paid trial within an envelope; the outcome need not succeed |
| Option-space expansion | A trial, demonstration or report reveals a use, method, partner or arrangement absent from the repertoire | Installs a provisional believed affordance or method (§13.5); no automatic mastery or certainty |
| Curiosity-driven activity | The activity of trying or investigating is expected to be engaging | Experienced process value under the general enjoyment law (§22.6), subject to familiarity, satiation, frustration, cost and risk |

These are explanatory categories for traces and analysis, not controllers or separate allowances.

#### 13.2 Three separate questions

1. **What could be tried?** Candidate trials are constructed from perceived properties, known operations, remembered techniques, observed activities, communicated suggestions, anomalies, aspirations and nearby people, places and materials (§13.3). A candidate need not specify a profitable end state; its predicted outcome may be only a broad class or "uncertain effect".
2. **Why try it now?** The arbiter compares the trial's typed consequences like any other option's: instrumental potential the person actually believes in, expected process value, slack and opportunity cost, risk, obligations, aspiration, dissatisfaction, social suggestion and uncertainty (§13.4). Unknown eventual usefulness is never itself a positive term.
3. **What can be learned?** The world's implemented laws decide what actually happens. Actual experience can update an estimate, reveal a physical property, reveal a social response, install a provisional affordance or method, refine or invalidate a method, and create a transmissible cognitive record (§13.5).

#### 13.3 What can be tried: the trial grammar

Candidate trials are instances of a small set of typed **trial forms**, declared as content (§4.5) and interpreted by the shared trial generator:

| Form | Construction | Typical predicted outcome |
| --- | --- | --- |
| T1 Unfamiliar target | Apply a known operation to a reachable material, site or entity whose perceived properties the person has not yet tried that operation on, where public model knowledge declares the operation compatible with those perceived properties | Uncertain effect of a broad class |
| T2 Substitution | Use a material with a believed relevant property in place of a known method's input | Comparable output with a different input |
| T3 Parameter variation | Vary one declared parameter of a known method (site, tool, quantity, quality target, preparation) within its declared range | A rate or quality change |
| T4 Inquiry channel | Visit a frontier, recheck a site, attend a gathering place, contact a person | Information about an existing question (§13.10) |
| T5 Social trial | Approach a new contact or setting with a known proposal template, or ask about a technique | A response; possibly a technique report |
| T6 Imitation | Attempt an activity the person has observed someone else perform with a visible result | The observed result, with fidelity uncertainty |
| T7 Suggestion | Follow a communicated suggestion of a technique or place | As reported, with source reliability |
| T8 Anomaly re-examination | Repeat or vary the conditions of a flagged anomalous outcome (§11.5) | The anomaly's repetition or explanation |

**Sources are indexed, not enumerated.** The generator draws from bounded indexes: local entities whose material kind is unfamiliar to the person (familiarity below `P.trial.unfamiliarity`), known operations indexed by the perceived input-property classes they accept, observed activities, received suggestions, anomaly records and active aspirations. A persisted **trial cursor** rotates fairly over eligible sources, and at most `P.trial.candidatesPerReview` candidates are constructed per review, each charged to the effort account. The generator never enumerates all recipes, all object pairs or all social arrangements, and never queries whether a matching recipe exists. It sees only perceived properties and the person's own repertoire.

#### 13.4 Why try it now

A trial option's consequence vector contains three kinds of term, all through §12.5.

**Instrumental potential the person believes in.** Each person holds a **trial-outcome prior** Beta(a, b) per (trial form, operation family, target kind), initialised from the culture's declared prior `P.trial.outcomePrior` and updated by their own and observed trials. A usable outcome of form φ on operation family o is expected to change the person's service from o by a relative gain ĝ\_φ, a cultural prior per form updated by experience. Over one subsequent decision interval H₁ (the investment horizon class):

```latex
\Delta V_{instr} = \hat p_{use}\;\min\big(\hat g_\varphi\,\hat S_o(H_1),\;\hat S_{cap}\big)
```

where Ŝ\_o(H₁) is the discounted service the person's current or aspired use of o provides over H₁, and Ŝ\_cap is the improvement achievable within H₁. If the person neither uses nor aspires to the service o provides, this term is zero, and only process value can motivate the trial. Information already counted here is not counted again as forecast production.

**Expected process value.** Voluntary, safe trials and inquiries belong to the discretionary-exploration activity family of the general enjoyment law (§22.6). Their pleasant weight per unit time depends on the person's own experienced familiarity with the activity's semantic descriptor, recent repetition of the family, and frustration from unrewarded attempts in that context. The same satiation law applies to ordinary leisure and social time, so "exploration" is not a rewarded label: an activity wins on process value only when it is genuinely more engaging to this person now than the alternatives they have been repeating. Dangerous scouting earns no process value.

**Costs.** Time, food, materials, travel and exposure appear in the forecast as for any option. Slack lowers opportunity cost because the forgone use of the time is worth less; it is not a reward. Obligations remain in the reference.

The resolved baseline therefore yields this behaviour without any special rule:

- A person with a poor livelihood has large instrumental terms; inquiry and trials win often, under the severe-risk policy when desperate (§12.7).
- A comfortable person with slack, whose leisure has become repetitive, can find an affordable unfamiliar-target trial or a short look beyond the frontier more engaging per unit time than another stretch of satiated leisure, and may choose it at small material cost.
- Repetition, growing familiarity, frustration, cost and danger reduce the attraction; prosperous people do not wander endlessly.
- Setting the exploration process weight and novelty sensitivity to zero (a declared variant) removes non-instrumental exploration entirely.

&#91;VII\] With steady leisure of 0.12 SD/SD in one family (satiation S = 1, κ\_sat = 0.5), a further unit of that leisure has pleasant weight 1/1.5 ≈ 0.67. A first safe trial on an unfamiliar material (familiarity 0, no frustration) has weight 0.3 × (1 + 1.5) = 0.75. Near camp, at negligible food cost, the trial is the better use of that slice of discretionary time; after three or four unrewarded repeats on similar material, frustration and familiarity drop it below leisure.

#### 13.5 What can be learned

A trial is executed as an ordinary operation carrying a **trial binding**: operation family, target entity or material kind, tool, site, and the varied parameter. The world resolves it through the authoritative material-effects law (§21.6): it matches the operation and the target's **true** properties against the trigger signatures of the method schemas the world implements. If a schema matches, the trial produces that schema's outcome at the trial yield factor `S.trial.yieldFactor` (unpractised); if none matches, the trial produces the schema-less outcome declared for the operation (time and trial inputs spent; sometimes a revealed property such as "too soft to flake"). Failed combinations consume their real costs.

The evidence service then records what the person observed:

| Transition | Effect in the repertoire or beliefs |
| --- | --- |
| Estimate update | Rates, yields, response priors, trial-outcome prior |
| Physical fact | A revealed property of the material kind (perceptible thereafter as a believed property) |
| Social response | Contextual response prior; tie update |
| Provisional affordance | A believed affordance at that site or with that partner, with provenance |
| Provisional method | A known-method record referencing the matched schema, with the observed context, one yield sample and low confidence |
| Refinement | Updated parameters and confidence after further successful use |
| Invalidation | Confidence reduced in the failing context; the method is marked unreliable there, not erased |
| Transmissible record | Any method or property the person holds can be taught, demonstrated or reported (§24.7) |

The proposer could not see the schema in advance. What is new is new **to the actor**: actor-relative novelty within the possibility space the world's laws implement. ESS does not invent unmodelled physics; a richer material or cultural law can later enlarge the possibility space without a new owner of agency. Provisional methods bind like any other, with estimates widened by their low confidence; confidence rises with repeated success and falls with failure in context. Mastery is separate and grows only through practice (§24).

#### 13.6 Trials and inquiries as ordinary tasks

A trial or inquiry intention is bound and executed like any other and carries:

| Part | Meaning |
| --- | --- |
| Descriptor | The trial binding or the question and the estimate it serves |
| Channel | The reachable material, site, frontier, gathering place, contact or record |
| Envelope | Cumulative time, materials, food and exposure authorised; protected duties; recovery to a known credible service or stopping point; stop conditions (§16.3) |
| Expected observation | What will be perceived, with its detection limits |
| Stop rule | Stop when the question is answered or the trial outcome observed; when relevant coverage is exhausted; when the marginal value of the next increment falls below its cost; when the envelope is spent; when safety deteriorates; when a commitment becomes urgent |

Optional trials and inquiries are funded from actual goods and slack without relying on the hoped-for result, under the reserve rule (§16.3). The envelope belongs to the semantic purpose and context, not to a task ID: renaming, re-heading, splitting or reloading cannot replenish it; renewal requires a real review of spend, evidence and remaining value. Forced safety costs may overrun the ceiling and are recorded honestly. Switching from testing to exploiting a newly found use is a new authorization.

#### 13.7 Culture: acquiring, retaining and transmitting cognitive content

Cultural knowledge consists of acquired methods, material-property beliefs, technique parameters, heuristics, norms and priors, each with provenance, scope and uncertainty. It enters a person only through real channels:

- **Founding culture:** the scenario's declared common repertoire and priors (§47).
- **Own trials:** §13.5.
- **Demonstration and imitation:** observing someone perform a method the observer lacks creates a technique hypothesis (T6), which a successful own attempt converts into a provisional method.
- **Teaching:** deliberate teaching (Attend plus mentorship, §24.7) installs a provisional method with confidence and parameter fidelity governed by the teacher's competence, the time spent and the learner's capacity.
- **Reports and, later, records:** a description of a technique installs a low-confidence hypothesis whose fidelity depends on detail, source reliability and channel.

Transmission never grants universal knowledge; installing content in the catalogue updates no mind. A transmitted technique may be misunderstood or locally unsuitable. Known methods are retained while used or taught; long-unused low-confidence methods may lapse from memory, and a method held by no living person is lost to the population until rediscovered. Cultural loss through death, migration and interrupted teaching is a real outcome.

#### 13.8 Aspiration

An aspiration is nominated when a person witnesses or is told of a service they lack and value: another's higher yield with a tool, a well-stocked store, a safer place, a teacher's skill. It records the desired service class and its estimated value from the person's own preferences, not the means. It enters the agenda as a standing objective (§12.1), can motivate inquiry, trials, investment, teaching requests or relocation, and can nominate improving a life already adequate for survival. It decays with τ `P.aspire.decay` when evidence makes it implausible or unused, and at most `P.aspire.max` are retained. Institutions can change what people attend to by teaching, recruiting, sanctioning and communicating; they never overwrite intentions.

#### 13.9 Priors and the leakage test

Priors have exactly three sources: the **cultural prior**, scenario content that may reflect the generator's expected densities for a kind of landscape but never realised placements, and may be deliberately wrong in an experiment; **experience**, through occupancy and trial-outcome updates; and **reports**, weighted by reliability. Prior strength is `P.prior.strengthArea`. **The leakage test:** two worlds from the same generator, identical in everything a person has observed but different in unseen placements and in which method schemas would match untried combinations, must produce identical choices until a difference is observed (§7.6).

#### 13.10 Instrumental inquiry: bounded information value

For a candidate inquiry q with a bounded set of observation classes o (`P.inquiry.outcomeClasses`, for example absent, poor, useful):

```latex
\mathrm{EVSI}(q)=\sum_o \hat P(o\mid E,q)\,\max_{a\in\mathcal A_o}\hat V(a\mid E,o)\;-\;\max_{a\in\mathcal A_0}\hat V(a\mid E)
```

Each action set contains only a small set of personally representable next decisions. A hypothetical unknown site is a distributional service category, never a world object; it cannot be executed or reserved. Benefit is retained only over one subsequent decision interval, with travel, adoption cost, access and remaining time represented. For looking from a frontier f, the probability of finding a useful option is 1 − Π\_{c ∈ R(f)} (1 − ρ̂\_c) over the unseen cells that would become visible (computed from known geometry, with the terrain mix of unseen cells estimated from nearby seen cells), with ρ̂\_c from the occupancy posterior (§11.4). Correlated cells and finite use time mean the aggregate saturates at what the person could use within the interval; a full payoff is never summed per cell, and belief in plentiful resources cannot pay for the outward trip. The same later harvest is never credited both as information value and as forecast production. All nested estimates spend from the review's effort account (§17.1).

#### 13.11 Contextual negative learning

Negative evidence stays contextual (§11.4–§11.5). A failed trial updates the trial-outcome prior of its own (form, operation family, target kind) cell, and the broader (form, operation family) cell only with weight `P.trial.generalisation`; one poor region, rejected proposal, failed material or failed technique never creates global incuriosity. An unchanged attempt with an unchanged zero-information result is suppressed by its attempt summary until relevant evidence, process time or context changes. Repeated failure of the same unchanged attempt therefore reduces repetition naturally, through both lower instrumental priors and higher contextual frustration, while unrelated exploration remains possible. Exploratory behaviour consequently varies with history, risk tolerance, patience, slack, recent repetition, learned enjoyment, culture, opportunity and environmental uncertainty, without any curiosity trait vector.

#### 13.12 Constitutional and provisional parts

**Constitutional (Level III–IV):** actor-relative new possibilities can enter through evidence; trials are paid, bounded and authorised; candidate generation sees only perceived properties and the repertoire; outcomes are decided by world law; information cannot reveal hidden truth; negative learning is contextual; one arbiter compares all uses; there is no quota, novelty score or discovery reward; acquired cognitive content persists, is causal state, and can be transmitted.

**Provisional (Level V, resolved in §47):** the trial forms and their compatibility table; trial-outcome and relative-gain priors; the process-value law's weights, familiarity, satiation and frustration constants; the trial yield factor; the occupancy prior; candidate, outcome-class and memory budgets; aspiration constants; transmission fidelity.

### 14. Capital and investment \[III–IV; values V\]

**An asset, skill, method or structure is worth the change it makes to the person's own dated future services, estimated from what that person actually does, has committed to, aspires to and credibly could do.** One differential service ledger values tools, weapons, caches, stores, workshops, boats, skills, methods and organisational infrastructure. No object has its own payback controller.

#### 14.1 The service-use summary

Each person maintains a bounded **service-use summary**: likely uses of each operation family with timing, rates, complementary inputs, access and uncertainty. Its evidence is:

- recent time allocation per operation family from the person's own activity ledger;
- uses implied by current intentions, projects and accepted commitments;
- **credible known opportunities**: uses of methods in the person's repertoire for which they hold evidenced access, even if they have never yet used them (cold-start uses);
- active aspirations, at their estimated value.

It is personal and observable to its owner. It is not a forecast of the world, a census of others' demand or a perfect schedule. Because known opportunities and aspirations enter it, a livelihood nobody has yet practised is not valued at zero merely for lack of history.

#### 14.2 One differential service ledger

For a candidate intervention x:

```latex
\Delta V_{capital}(x)=V(\text{service schedule with }x)-V(\text{same schedule without }x)-C_{remaining}(x)
```

Both schedules are compiled from the same method descriptions and evidence. Only services plausibly affected by x change. The estimate accounts for displacement of existing production, overlap among tools, declining returns to practice, wear and repair, spoilage, transport, setup, demand limits, and uncertainty of continued access (P\_keep: durability, known loss or theft risk, own survival). C\_remaining counts only the remaining acquisition and transition cost; sunk inputs are excluded. Capital value is never added on top of the same later production already booked in a forecast: a forecast uses either explicit service differences or this compressed equivalent, with provenance showing which future ledger entries it replaces.

#### 14.3 Rate capital and option capital

The two kinds of capital differ in how their effect enters the service schedule, not in how they are valued.

- **Rate capital** changes the rate, cost or loss of service lines the person already has or credibly could have: a tool multiplies extraction output; a cache lowers spoilage of stored food; mastery raises realised rate; a road lowers travel cost.
- **Option capital** adds service lines the person cannot otherwise execute: a boat makes a river crossable; a weapon makes dangerous prey huntable; a workshop permits high-quality work; a method or input opens a new product. Its value is the improvement in the best bounded option for the person's active and standing objectives when the capability is assumed, found by the same project binder (§15) **spending from the same review's effort account** (§17.1). Option-capital estimation never opens a fresh planning budget.

#### 14.4 Units: capital effects as dated services

Capital effects are translated into dated consequences in the typed terms of §12.5 before they are compared. A weapon's force multiplier becomes changed hunt success probability, changed injury risk and changed food yield over time; a tool's output multiplier becomes changed FU/SD in the lines that use it; a cache's spoilage reduction becomes FU preserved on quantities the person actually expects to store. Force, output and time are never multiplied or added across units. Each changed service enters once.

#### 14.5 Complementary bundles

Evidence may support a bundle whose components are useless alone: a boat with no known destination, a workshop with no downstream use, inputs for a multi-stage product. The bundle is evaluated once, as a project (§15.7), by its incremental service schedule and remaining costs. One residual surplus and funding envelope is carried across its inputs as they are acquired or committed, so one project cannot justify the full payoff separately for every input. A partially resolved bundle may justify a cheap trial or a reversible first step; unresolved benefits never serve as material backing.

#### 14.6 Skills, methods and storage

- **Practice** is rate capital on the person's own body. The learning law is public model knowledge (§24.2); current mastery is inferred approximately from practice history and experienced rates. Learning that happens as a side effect of an option's work is counted once, in that option.
- **Acquiring a method** (by trial, teaching or demonstration) is option capital whose value is the service of the new line at the person's provisional confidence.
- **A cache or store** is rate capital valued only on quantities the person expects to store and use. A distant cache with no projected use correctly loses.

#### 14.7 Uncertainty, staging and abandonment

Rate estimates are noisy, uses change, assets are lost; held forecast error applies (§12.9), and people over- and under-invest. When value is highly uncertain, a cheap first step (one input, a small trial of a method) can win on its information and process value under §13 even when full commitment would not. At each reconsideration a partly built asset is compared on remaining cost against remaining benefit; its work-in-progress remains in the world and may be resumed or used by someone else.

#### 14.8 Shared and social capital

Shared structures are valued by each person from their own use and their recognised claim on the structure's services, plus negotiated returns and valued dependants or ties. The builder never silently receives the sum of everyone's benefits. Building one together requires accepted commitments (§26); no group utility is maximised. Relationship investment is valued through the existing relationship and reciprocity terms, never as a separate capital stock.

#### 14.9 What the estimator must not do

It must not simulate the world forward, predict others' adoption or prices without evidence, credit resale without a known buyer or use, add intrinsic value for owning things, credit the same future output twice, mix incompatible units, or recursively mint planning budget.

#### 14.10 Example \[VII\]

A work tool needs 1 wood and 1 stone, about 0.66 reference work-SD of extraction and crafting plus travel, and gives roughly ×1.25 gathering at quality 0.85, wearing 0.04 per active work-SD. A person whose summary shows 0.4 work-SD/SD gathering at 6 FU per work-SD gains about 0.6 FU/SD while the tool lasts. Over 12 SD, discounted and net of wear, that exceeds the inputs and forgone harvest when materials are near. A person who rarely gathers, or whose materials lie a long journey away, correctly declines.

### 15. Persistent projects and bounded planning \[III; values V\]

**Cognitive work and active representation are bounded at every review. The total causal depth of what a person may pursue across a life is not.** A persistent project may span an arbitrarily long real sequence of prerequisites over time, while each reconsideration of it remains strictly bounded. Resumability never licenses an unbounded search tree hidden across many reviews.

#### 15.1 Principle

There is no fixed planner depth. A person binds an objective to known methods, expands only a small decision-relevant frontier of unresolved prerequisites per review, commits an executable prefix, and retains the rest as a compact project record that later reviews resume. Over enough reviews a long serial chain can be pursued to completion. Nothing guarantees that any particular long plan is discovered, chosen or completed; what is guaranteed is that no depth or horizon accident makes a whole class of plans impossible by definition.

#### 15.2 The project record

A project is causal state owned by the mind and saved in checkpoints. It is not an autonomous actor.

| Field | Meaning |
| --- | --- |
| Desired result | The service or state sought, typed as an objective |
| Sponsor and scope | A person, or an institution with the role holders entitled to amend, renew or abandon it (§15.10) |
| Milestones | A bounded list of concrete intermediate results, each an objective |
| Dependency frontier | Bounded set of unresolved prerequisite nodes with their states (§15.3), alternatives, and the method bindings tried |
| Evidence assumptions | The belief versions and repertoire records the project rests on |
| Funding | Actual goods, accepted deliveries and their reliability, contingencies; never unresolved benefits |
| Committed prefix | The executable steps currently authorised, with their envelope |
| Attempt history | Semantic attempt summaries per prerequisite (§11.6) |
| Renewal condition | The next scheduled review time and the evidence events that reopen it |
| Compacted summaries | Completed milestones and abandoned branches reduced to their results and reasons |

#### 15.3 Prerequisite states

Every frontier node has exactly one state, and each state calls for a different response:

| State | Meaning | Typical next step |
| --- | --- | --- |
| Known available | The person holds or can access it now | Use it |
| Executable | A known method can produce or obtain it with available inputs | Schedule it in the prefix |
| Contingent on another person | Requires someone's act or goods | A proposal milestone |
| Epistemically unresolved | Unknown whether a source, route or partner exists | An inquiry or trial milestone |
| Computationally deferred | Not yet expanded because the review's effort ran out | Expand in a later review |
| Unsupported by current method | No known method produces it | Seek a method (trial, teaching, report) or abandon the branch |
| Impossible under stated assumptions | Proven infeasible given recorded evidence | Close; reopen only if those assumptions change |

"Deferred" and "unsupported" are never silently converted into "impossible".

#### 15.4 Refinement in one review

1. Retrieve methods for the objective or milestone from the person's method index by produced effect type (§17.3), bounded and diverse; canonicalise equivalent bindings (same result, target, terms and information context).
2. Bind exact own goods first, then personally known access, sources and offers. Annotate each prerequisite with its state.
3. Detect cycles, distinguishing consumed inputs, reusable catalysts and startup stock. A cycle with no startup stock is not a source; a renewable feedback process with valid startup stock is.
4. Expand the most decision-relevant unresolved node, best-first by its effect on the comparison, within `P.plan.nodesPerReview` expansions and the effort account. Stop when further expansion is unlikely to change this review's choice.
5. Construct an executable prefix using actual locations and dependencies, inserting travel, handling, due maintenance and accepted appointments. Deadline-bound duties are placed by imminent severe harm, then due time, then semantic-key symmetric priority.
6. Estimate the option: exact near-term funding and timing, explicit forecast to the comparison horizon, completion tail beyond it (§15.6).
7. The result is a complete candidate, an executable inquiry or trial, or a reasoned deferral. Never a silently assumed completed chain.

The binder, estimator and runtime interpret one causal description with different permissions: beliefs and repertoire for binding and estimation; local authoritative state for execution.

#### 15.5 Bounds and compaction

Per person: at most `P.plan.retainedProjects` retained projects; per project, at most `P.plan.activeNodes` frontier nodes, `P.plan.altsPerNode` alternatives per unresolved node and `P.plan.storedBranches` stored optional branches. When a bound is reached, funded commitments and necessary summaries are preserved; optional branches are discarded with an explicit status in the attempt history. Completed milestones are compacted to their results (their physical products remain world entities). No exponentially growing tree is kept on disk.

#### 15.6 Horizons and completion tails

All options in one comparison are forecast explicitly to a common horizon H (§12.8). Beyond H, each option, including the reference, carries a **completion tail**: a compressed service summary anchored to the option's expected completion time T\_c (which may lie beyond H), its post-completion net service rate s in the typed terms, and a keep hazard κ\_keep combining wear, known loss risk and the person's own age hazard:

```latex
T=\frac{s\;e^{-\max(H,T_c)/\tau_i}\;e^{-\kappa_{keep}\,(\max(H,T_c)-T_c)}}{1/\tau_i+\kappa_{keep}}\;-\;\int_H^{\max(H,T_c)} e^{-t/\tau_i}\,\dot c_{remaining}(t)\,dt
```

The second term charges remaining costs between H and completion. The reference's tail is its own steady continuation service from H. Tails carry doubled held error (§12.9) and use T\_c's uncertainty explicitly. A known bridge that takes longer than the strategic horizon can therefore be represented and chosen; it may still lose because of discounting, risk or funding. No arbitrary terminal value is ever awarded to make a project win.

#### 15.7 Complementary projects and cold starts

A bundle whose components only pay together (§14.5) is a single project with one residual funding envelope. A livelihood that requires several complementary inputs can be considered before any component has standalone payoff, because the project's desired result is evaluated as a whole and its unresolved inputs are frontier nodes. Credible known opportunities enter the service-use summary (§14.1), so a cold-start livelihood is not invisible merely because nobody has used it yet.

#### 15.8 Renewal, deferral and reopening

Strategic re-evaluation does not run on every tactical interrupt. The runtime repairs the current authorised prefix cheaply (§16.4); the project's assumptions are revisited at its renewal time (`P.plan.renewalInterval`, coalesced into ordinary reviews) or when relevant evidence arrives. Renewal compares remaining value, evidence and cumulative effort. An unchanged unresolved problem is deferred rather than retried at every wake. New evidence, a newly acquired method or changed constraints reopen closed or deferred nodes. Sunk investment is never a reason to continue; located progress reduces remaining cost. A project cannot credit an undiscovered resource, an unaccepted ally or an unconceived child as secured; its first milestone may be an inquiry or a trial.

#### 15.9 Fair means admission

Fairness operates below broad drive categories. For each admitted objective the binder considers the best method by cheap pre-estimate plus the method selected by that objective's **method cursor**, which rotates over the eligible known methods by least-recently-considered (ties by semantic key). Under recurring available attention and a finite, stable eligible set, every eligible method is considered within a bounded number of reviews. A useful method can never be permanently excluded because it always appears seventh in an index. This is a consideration guarantee, not a choice guarantee.

#### 15.10 Institutional and group projects

A project may be sponsored by an institution (§34). Its record names the roles entitled to amend, renew or abandon it and the scope within which holders may authorise steps. It is evaluated by whichever holder's mind is reviewing it, from that holder's own beliefs and preferences, including their accepted role duties. Members perform its tasks through their own commitments and envelopes. No group utility is computed and no member's assent is presumed.

#### 15.11 Complexity obligation and adversarial cases

Ordinary review work is bounded by the effort budget plus indexed access overhead and genuinely affected mandatory records (§17). Project lifetime work grows with actual reviews, evidence and executed stages, never with an implicit enumeration of plans. Each of these cases must produce a bounded trace explaining progress, deferral or abandonment: a serial chain longer than one review's expansion budget; a branching but mostly irrelevant catalogue; a dependency cycle without startup stock; a renewable feedback process with valid startup stock; a complementary bundle; a refused supplier; a stale route; a payoff beyond the strategic horizon; and a permanently unproductive project.

### 16. Intentions, tasks, execution and authorization envelopes \[III\]

**The mind decides what to pursue and authorises it; the task runtime carries out what was authorised; the world decides what happens. Same objective does not mean same meaning: the runtime may refine means only inside an explicit authorization envelope, and returns to the mind whenever a repair would change a meaningful trade-off.** Partial physical progress lives in the world, so nothing is lost when plans change.

#### 16.1 The six operation families

| Operation | What happens | Examples | Distinct laws it may invoke |
| --- | --- | --- | --- |
| **Move** | Paid travel along a path with load, body and terrain effects | Walking, hauling, escorting, marching | Terrain, body, later vehicle and access physics |
| **Work** | Paid effort under a declared work law | Gathering, quarrying, crafting, building, repairing, trials, caring, teaching, practising, watching, administering | Extraction, transformation, material effects, construction, repair, practice, teaching, care |
| **Transfer** | Change of location, custody or consumption of goods, always with an action basis (§16.7) | Take, put, give, eat, deliver, deposit, appropriate | Gift, consumption, exchange, ration, estate, contested taking |
| **Attend** | Scoped co-present interaction or observation with real attention | Looking, conversation, meetings, proposals, handovers, ceremonies, reading | Observation, instruction, recognition, assent |
| **Recover** | Rest or leisure at a legitimate location | Sleep, rest, play, voluntary social time | Rest, enjoyment, healing behaviour |
| **Engage** | Contested local interaction resolved by force, detection and injury laws | Hunting dangerous prey, fighting, defending, fleeing | Hunt, combat, escape, occupation |

New activities are content over these families. Pregnancy, growth, mortality and ecological renewal are autonomous law processes, not operations anyone selects. A seventh family requires an architecture decision.

#### 16.2 Intention, task and step

- **Intention:** the mind's selected objective, bound method, the belief and repertoire versions it rests on, and its authorization envelope.
- **Task:** the runtime's executable form of an intention: an ordered, bounded suffix of steps with its dependencies.
- **Step:** one operation request with a completion event.

&#91;VII\] Illustrative record:

```ts
type Task = {
  key; actor; objective; method; bindings;             // known targets and exact terms only
  steps: Step[]; cursor; status: 'ready'|'running'|'suspended'|'blocked'|'done'|'failed'|'abandoned';
  dependsOn: BeliefVersion[]; reservations: LeaseId[];
  envelope: AuthorizationEnvelope; spent: Spend;         // cumulative by semantic purpose
  progress: WorldRef[];                                  // route progress, work-in-progress, deliveries
  commitment?: CommitmentKey; project?: ProjectKey; semanticKey;
};
```

#### 16.3 The authorization envelope

Selection grants an envelope. Its fields are typed and optional, with conservative defaults (`P.env.defaults`). **Absence of authority is not permission:** any dimension the envelope does not authorise is fixed at the value bound at selection.

| Field | Constrains |
| --- | --- |
| End and semantic purpose | The objective and what it is for (feed self, feed a dependant, fulfil a commitment, test a method) |
| Permitted substitutions | Which method alternatives and equivalence classes the runtime may switch among |
| Targets and counterparties | Specific targets, or a genuinely authorised target class; the counterparties or counterparty class |
| Terms | Exact accepted terms; no new terms |
| Quantity and quality | Ranges acceptable |
| Cumulative time | Total time authorised for the purpose, not per task |
| Material and spending limits | Goods that may be consumed, given or committed |
| Exposure and risk | Maximum estimated severe-risk exposure and the hazards accepted |
| Rights exercised | Action bases permitted (own use, consensual transfer, scoped authority; contested taking only if selected as such) |
| Protected obligations | Duties the execution must not displace |
| Deadline or window | When the end must be reached |
| Location and access basis | Where execution may occur and under what access |
| Recovery and stop conditions | Required recovery to a known credible service or stopping point; conditions that end the task |
| Evidence assumptions | The beliefs whose change invalidates the authorization |
| Escalation conditions | Events that must return the decision to the mind |

**The reserve rule** applies to every optional envelope: projected own accessible food must stay above `P.env.reserve` at the estimated return point, without relying on the hoped-for result. Optional envelopes that lack an established return (inquiries, trials, courtship spending, optional support) are capped at selection by `P.env.optionalCeiling` and renewed only by review.

#### 16.4 Repair equivalence and escalation

Repair may, inside the envelope:

- refine a known route or detour within the authorised exposure;
- fetch an already authorised input from an authorised source;
- substitute an equivalent component inside the declared equivalence class and tolerances;
- split a delivery within accepted partial-delivery terms;
- resume located work-in-progress;
- perform authorised maintenance (§16.5);
- rearrange local execution order within existing commitments and the window.

Among authorised means, repair uses a deterministic cheap ordering: lowest estimated remaining cost from the person's beliefs, ties by semantic key. It never performs a new strategic or social utility maximisation, and it never uses truth-side convenience: the cheapest truth-side repair is not thereby an authorised one.

**Escalation is mandatory** when a repair would change any of: the counterparty or target class; the terms; the rights basis; the semantic purpose; a commitment (taking on or breaking one); exposure beyond the limit; spending beyond the limit; a protected obligation; the deadline's feasibility; a recorded evidence assumption; or a choice between candidates that depend on a new trade-off. The runtime then returns candidates to the mind, which reconsiders under the effort account and, where a new party is involved, seeks fresh assent.

&#91;VII\] "Obtain food" authorised as gathering at known patches may switch to another known patch inside the exposure limit. It may not switch to buying from a creditor, eating a dependant's share, taking from a rival, or accepting a new obligation; each of those wakes the mind.

#### 16.5 Standing authorizations

Some envelopes persist across tasks:

- **Maintenance:** the person's current daily allocation plan authorises eating own carried food on schedule, resting when rest debt crosses its threshold, and routine care of own dependants within accepted allocations. Suspension of a task for rest, care or safety happens under this standing envelope, which the mind chose; a change in the trade-off it encodes wakes the mind.
- **Role scopes:** an accepted role authorises the routine steps of its adopted procedures within declared scope (§34.5). Fresh assent is required when terms or scope change; accepted duty still permits explicit breach.
- **Safety responses** are selected by the bounded safety branch of the same mind (§17.5), never by a global threat flag reading hidden truth.

#### 16.6 Lifecycle rules

- **Paid prefix.** Each running operation has one paid-through cursor. Before its inputs change, the elapsed prefix is settled exactly once (§9.2).
- **Located progress.** Work-in-progress, harvested goods, cargo and route position live in the world. A suspended or abandoned task loses none of them; replanning sees them as known affordances.
- **Semantic identity.** A retried or resumed task keeps its semantic key, so held outcomes and envelope spend persist. A new task ID cannot renew a budget, reroll a draw or erase a debt.
- **Reservations and leases.** Reservations commit existing owned goods, items and participant time once, as leases with declared expiry. Multi-party reservations commit atomically or through provisional leases (§26.4). Wild unowned stocks are not reserved by intention; contention is settled at extraction. Waiting always names an event or a deadline and an expiry; circular waits are broken by expiry and surface as observable failures.
- **Reflex intentions.** Flight, shelter and defence are ordinary intentions selected by the safety branch; they suspend, not erase, the previous intention.

#### 16.7 Physical possibility and social entitlement

Property rights are typed social relations, not physical force fields. Every Transfer carries an **action basis**:

| Basis | Requires | Effect on claims |
| --- | --- | --- |
| Own or claim use | The actor's backed claim | Debits that claim |
| Consensual transfer | An accepted commitment version, or a gift accepted by the recipient | Moves the claim with the goods |
| Scoped authority | A recognised role or office scope covering the goods (custodian, allocator) | Per the scope's rules |
| Contested taking | Physical access only | Moves the goods; prior claimants' backed claims on that quantity become unbacked, disputed historical claims |

The ledger demands a valid transaction kind, finite backing and physical access; it does not demand legitimate title for a physically possible transfer. The world rejects a taking only physically: the actor cannot reach the goods, a lock or structure prevents access, or an actual defender intervenes through an engagement. A contested taking is observable to those who perceive it, creates harmful experience for victims who learn of it, and can provoke sanctions or recovery attempts by anyone who chooses them. It never manufactures consent, never duplicates goods and never erases prior claims. The reproductive consent invariant is not generalised into this exception: no transaction basis exists for an encounter.

#### 16.8 Obligations in execution

Due obligations appear on the debtor's agenda (§26). Once selected, performance is an ordinary task bound to the commitment. Obligations and tasks have different lifetimes: abandoning a delivery task does not erase the debt; ending an adult relationship does not erase a child's need; a holder's death does not erase an institution's surviving duties. Conflicting obligations are resolved by the mind through commitment semantics (§12.6). Attention limits never delete an obligation.

#### 16.9 What this replaces

One runtime with envelopes replaces every per-behaviour persistence and funding mechanism: journey records, retained work, search episodes, scout states, tool objectives, cache purposes, food purposes, learning targets and exploration certificates. Their meanings survive as objectives, bindings and envelope fields; their lifecycle is shared.

### 17. Cognitive effort account, indexed retrieval and wake discipline \[III; values V\]

**Total cognitive work is bounded by one instrumented account per review, shared by every nested evaluation. Retrieval is indexed so that irrelevant catalogue growth costs nothing per review. Wakes are coalesced and edge-triggered so no state can loop. Exhaustion defers; it never declares impossible.**

#### 17.1 The effort account

Every reconsideration opens one effort account with budget `P.effort.review` effort units (EU); the safety branch opens a separate small account `P.effort.safety`. Runtime repair uses its own bounded deterministic allowance `P.effort.repair` and performs no option comparison. Every cognitive operation charges the open account at declared unit costs (`N.effort.unitCosts`):

| Charged operation | Charged per |
| --- | --- |
| Agenda descriptor (cheap pre-estimate) | Descriptor |
| Index retrieval | Candidate returned |
| Binding node expansion | Node |
| Trial candidate construction | Candidate |
| Forecast | Block per option |
| Information-value outcome class | Class per block |
| Counterparty consideration | Person considered |
| Route search | Fixed number of cell expansions |

**Nesting never mints budget.** Option-capital estimation, information valuation, route estimation and counterparty consideration invoked inside a review draw from the same account. A nested estimator that runs out returns a bounded, explicitly incomplete estimate marked deferred. The product options × methods × routes × information outcomes × capital counterfactuals × counterparties × project dependencies is therefore bounded by the account, not by the product of separate limits.

#### 17.2 Agenda and fair admission

The agenda is assembled from indexes (§17.3), in this order, each charged to the account:

1. **Mandatory:** the continuation reference; due obligations that conflict with it; the current project's renewal if due.
2. **Urgent drives:** at most `P.attn.urgentDrives`, by urgency.
3. **Actionable proposal versions:** at most `P.attn.offers`, by expiry.
4. **Project dependencies** whose evidence changed.
5. **Fairness item:** one eligible item chosen by the persisted agenda cursor, which rotates over every eligible standing objective, aspiration, deferred question and project by least-recently-considered (ties by semantic key).
6. **Trial candidates** from the trial generator (§13.3).
7. **Pre-scored fill:** remaining capacity, up to `P.attn.descriptors` cheap descriptors, from which at most `P.attn.fullComparisons` options (including the reference) receive full binding and forecasting.

Duplicates are canonicalised before selection. The incumbent is held separately so it can never disappear because the agenda filled. Learned heuristics (§12.3) may reweight the pre-scorer's typed features; they cannot remove mandatory items or the fairness item. This yields a **consideration guarantee**: under recurring attention and a finite eligible agenda, every eligible item and, through method cursors (§15.9), every eligible method is considered within a bounded number of reviews. It is not a protected action, a guaranteed acceptance or a percentage of wandering.

#### 17.3 Indexed retrieval

Each person's cognition reads only through indexes maintained incrementally at insertion:

| Index | Keyed by |
| --- | --- |
| Known methods | Produced effect type; accepted input-property class |
| Effects and material properties | Property class; operation family |
| Personal places | Resource kind; personal region |
| Relevant people | Service or role; place; tie strength |
| Obligations | Due time (the due index) |
| Projects | Renewal time; frontier node evidence keys |
| Social opportunities | Setting; proposal kind |
| Trial sources | Unfamiliar local material kinds; observed activities; suggestions; anomalies |

Index construction may cost catalogue size once. Each review's cost must not grow with the size of the content catalogue or with records irrelevant to the review. Adding unused methods, goods or relation templates leaves ordinary cognition approximately unaffected.

#### 17.4 Mandatory records and affected processing

Causally mandatory records persist regardless of attention. Due obligations live in the due index; a review processes only obligations that are affected or selected. Mandatory physical consequences occur through world laws whether or not anyone deliberates: an undelivered care obligation leaves real unmet need, a spoiling store loses goods, an expired lease releases. Real work grows with genuinely active obligations and local density, and is reported as such; it is never reduced by silently deleting records.

#### 17.5 Wake discipline

- **Coalescing.** All wake requests for one person at one timestamp merge into one review in phase 8, with the union of causes.
- **Edge triggers.** Thresholds fire on crossing and re-arm only after recrossing their re-arm level (§9.5).
- **Same-state guard.** Each review records a **wake signature**: its cause class plus the referenced personal-state features quantised at `N.wake.signatureQuanta` and the versions of the beliefs and commitments it consulted. A later wake with an identical signature and no intervening change in those items is dropped and counted.
- **Cap.** Discretionary reconsiderations are limited to `P.attn.reviewCap` per person per SD; further ordinary wakes are deferred to the next epoch and recorded.
- **Safety branch.** New threat evidence (a new threat entity perceived, or a change of its distance band) triggers the safety branch, which is exempt from the cap but not from coalescing or the same-state guard. It evaluates only flight, shelter, defence and the continuation, under `P.effort.safety`. Perceiving the same threat at the same band does not re-trigger it.

#### 17.6 Exhaustion semantics

When an account runs out, unexamined agenda items are marked deferred, unexpanded frontier nodes are marked computationally deferred, and incomplete routes keep resumable frontiers. Nothing is marked impossible because computation stopped. Technical resource exhaustion (memory, queue capacity) pauses the run with a checkpoint; it never erases duties, suppresses births or kills anyone.

#### 17.7 Budgets are causal policy

Every budget in this section can change what is considered, when action starts and which option wins. All are class P or N, versioned and resolved in §47, and changing one is a model change. Sensitivity tests must show that modest budget changes do not merely repair an accidentally unreachable core behaviour (§44.2).

#### 17.8 The complexity contract

Per review: work ≤ the effort budget + indexed access overhead + genuinely affected mandatory records. Per valid continuation: the affected dependencies and the next operation only, with no option comparison and no route search. Over a lifetime: work grows with actual reviews, evidence and executed stages. The kernel counts, per living person-SD: wakes by tier, cause and drop reason; EU spent by operation class; agenda items admitted and deferred; binding expansions; trial candidates; forecast blocks; route expansions; obligations processed; pinned records. Counts are non-causal and always reported with living exposure.

### 18. Bounded rationality, heterogeneity and behavioural contracts \[IV\]

**People must be capable, not optimal: locally informed, historically contingent, heterogeneous, fallible, bounded in attention and planning, capable of habit, persistent intention, exploration and learning.** These contracts state what the substrate must make possible and which pathologies it must not produce. Each is tested directionally and with positive and negative cases (§44), never by quotas.

#### 18.1 Capability contracts

Under appropriate evidence and opportunity, a person must be able to:

| # | Contract |
| --- | --- |
| B1 | Meet bodily needs by choosing among known food, rest and recovery options and paying their real costs |
| B2 | Keep a selected intention through movement, rest, closures and interruptions, and resume it from where the world left it |
| B3 | Abandon an intention when its remaining value falls below alternatives, without sunk-cost bias |
| B4 | Inquire when known options are poor, and occasionally when they are adequate |
| B5 | Undertake a bounded trial whose useful result is not in their repertoire, learn a new use or method from the actual outcome, and later exploit it |
| B6 | Stop investigating or trying where it has failed, contextually, without becoming globally incurious |
| B7 | Sacrifice present consumption for future capacity when evidence supports it, and decline when it does not |
| B8 | Pursue a serial chain of prerequisites longer than one review's expansion budget across several reviews, without a domain-specific plan; defer or abandon honestly when the chain is cyclic, unfunded or unproductive |
| B9 | Learn their own abilities from experience, others' from observation, and methods from demonstration, teaching and reports; teach methods they hold |
| B10 | Fulfil, renegotiate or explicitly breach obligations, and weigh obligations against own needs |
| B11 | Propose, accept, refuse and counter exact terms; exit arrangements when alternatives are better; be refused |
| B12 | Have execution repaired automatically where the repair is authorised, and be consulted where it is not |
| B13 | Respond to danger immediately, then return to their purposes |
| B14 | Make mistakes: overestimate, underestimate, act on stale evidence, misunderstand a transmitted technique, and live with the consequences |

#### 18.2 Pathologies and their general preventions

| Pathology | Symptom | General prevention |
| --- | --- | --- |
| Aimless wandering | Repeated low-value movement | Information value capped by usable decision improvement; real costs; occupancy posteriors fall after empty looks; satiation and frustration lower process value |
| Exploitation lock-in | Nobody discovers changed opportunity or a new method | Volatility-aware widening of dynamic beliefs; agenda fairness cursor; trial generator over unfamiliar perceived properties; process value of unfamiliar activity |
| Global incuriosity | One failure stops all exploration | Context-indexed priors and frustration; generalisation weight below one |
| Utility thrashing | Frequent switching, little completed work | Continuation as reference; real switching costs; incumbent margin; error held per epoch |
| Excessive replanning | Deliberation grows with steps | Three tiers; reconsideration only on wake causes; coalescing; edge triggers; same-state guard; cap |
| Omniscient affordances | Plans target the unseen | Belief-only binding; trial generator sees only perceived properties; paired hidden-world tests |
| Combinatorial planning | Review cost grows with content or nesting | One effort account; indexed retrieval; frontier bounds |
| Permanent exclusion by bounds | A useful method or long project is never reachable | No depth ceiling; persistent frontiers; method and agenda cursors; completion tails |
| Runtime takeover | Execution silently changes what was chosen | Authorization envelopes; mandatory escalation |
| Deadlock | Mutual waiting | Expiring proposals, leases and appointments; no wait without expiry |
| Hyper-rationality | Everyone finds the global best | Partial, dated, noisy beliefs; bounded memory, attention and effort; coarse forecasts |
| Identical agents | Uniform behaviour | Biology, history, dispositions, priors, repertoire, ties, possessions and keyed error all differ |
| Hidden global optimisation | Allocation looks centrally planned | No group utility; coordinators propose, participants decide; pledges validated only from declared contributions |
| Starvation through optimism | Exploring or investing while food runs out | Severe-risk gate before utility; reserve rule on envelopes |
| Duplicate credit | One outcome counted twice | One differential ledger; provenance-deduplicated evidence and success credit |

#### 18.3 What makes people different, in decisions

Identical decision code yields different decisions because inputs differ: rates (biology and mastery through experience), patience (discounting), risk tolerance (risk ceiling), relational concern (weights on dependants and ties), priors and repertoire (exploration and binding), heuristics (search ordering), satiation and familiarity (process value), memories (known options), ties (whom to ask and trust), commitments (what is owed), possessions (what is feasible) and position (what is near). No behaviour is selected by checking a person's identity, class or role, except where a law (fertility, class-specific task expression) is itself the scientific claim.

#### 18.4 Habit, specialisation and expertise

Habit emerges without a habit mechanism: a person whose use summary is dominated by one activity has the best rate estimates for it, the most refined methods for it, capital that improves it, and an incumbent reference that resists marginal alternatives. Specialisation is the same process across a lifetime. Expertise is accumulated repertoire and mastery: two people with different learned methods and heuristics search, estimate and perform differently with identical code, and a label change alone changes nothing.

## Part IV — The material world

### 19. Ecology, terrain and resources \[II laws; V values\]

**The landscape and its renewable stocks are finite and physically located; people compete for them by being there and working them.** Ecology is a law module with anchored analytic state; it never runs a global tick.

#### 19.1 Terrain generation \[VI method; V parameters\]

Generate seeded, domain-warped multi-octave fields for elevation, moisture, fertility and geology. Derive slope, passability, soil, forest, scrub, grass, hills, cliffs, exposed rock and wetland. Fill or breach depressions, derive acyclic downhill drainage and accumulated flow, and mark streams and rivers by flow thresholds. Fords, passes and crossings are real passable cells. Rendering, routing, fishing and settlement opportunities refer to the same cells. Exposed or cold cells may carry an exposure cost (§22.1). The same seed, configuration and generator version reproduce the same world; different seeds change real geographical opportunity.

#### 19.2 Renewable and finite resource sites

A resource site is a located stock P with a renewal law. Between extraction events:

```latex
P(t+\Delta)=K-(K-P(t))\,e^{-\Delta/\tau}
```

| Resource kind | Capacity K | Renewal τ | Notes |
| --- | --- | --- | --- |
| Food patch | 24 FU | 8 SD | Site factor Z = z\_habitat (0.25 + 0.75 P/K) while P > 0; zero at P = 0 |
| Wood | 30 units | 60 SD |  |
| Fibre | 24 units | 12 SD |  |
| Stone deposit | 120 units | none | Finite; deposits have a material kind (§19.5) |
| Fishing node | per node | per node | Water-adjacent; extraction requires a compatible tool |

The residual 0.25 in the site factor represents effort on sparse remaining stock; it never creates output from an empty stock.

**Harvest settlement.** Simultaneous extraction claims are settled against one pre-claim stock including accrued renewal, prorated or ordered by semantic-key symmetric priority. Output is bounded by work, stock, access and free cargo. For constant-demand work the stock–renewal equation is solved analytically and depletion is scheduled as an event; a batch cannot harvest biomass that regrows only after it ends. Dropped output becomes a located object, never an invisible reserve. Unclaimed sites stay anchored until materialised.

#### 19.3 Animals

Animals are finite individuals with semantic keys, located in habitats.

| Animal | Force | Yield |
| --- | --- | --- |
| Ordinary prey | 0.6 | 3 FU + 1 soft material |
| Dangerous prey | 2.0 | 8 FU + 2 soft material |
| Predator | 1.6 | 0.5 FU, ≤ 1 soft material |
| Apex predator | 3.0 | 0.75 FU, ≤ 1 soft material |

- **Prey habitats.** Edible-biomass capacity 32 FU, recovery τ = 12 SD, at most 8 living animals. Tracked biomass includes uninstantiated reserve and animals' biomass; renewal fills only the reserve. Spawning moves reserve into one animal by a keyed next-spawn recipe (ordinary 0.75, dangerous 0.25), only when both a slot and enough reserve exist; waiting does not reroll it. Killing moves an animal's biomass into one carcass. An animal is never counted as both reserve and living stock.
- **Predator dens.** Living capacity 2; replacement progress ż = (2 − A\_den)/18 per SD while active with vacancies; at z = 1 one animal appears. Clearing a den stops replacement but does not remove surviving animals. This simplified source is reported separately in ecological diagnostics.
- **Behaviour.** Animals follow local laws, not minds: prey flee detected threats; predators pursue at most one visible, reachable target along actual geometry. Within 0.8 km the attempted pursuit hazard is 0.15 \[1 − distance/0.8\]₊ per SD, scaled by the danger setting, with one hazard budget per pursuit opportunity. Escape, interception and combat use the contest law (§37.2).

#### 19.4 Detection, sleep sites and watch

Deliberate search raises detection over the passive formula of §11.1: p\_det,search = clip(1 − (1 − p\_det)^(1 + sat(K\_Field)), 0, 0.95). Rest is possible at camps, caches, stores, outposts, settlements and bivouacs; choice among them uses travel, supplies and estimated risk. A label is not protection.

Guards occupy real watch time. At an approach event each awake guard makes one keyed detection check with probability clip(0.30 + 0.40 sat(K\_Field), 0.30, 0.70), reduced by occlusion; watchers combine as 1 − Π(1 − p\_g), capped at 0.95. Unguarded sleepers have 0.10 spontaneous detection. Undetected sleepers fight their first exchange at a 0.75 response factor, once. Warnings carry 0.15 km audibly; further only by messenger. The benefit of organisation is actual detection and response, never an abstract safety bonus.

#### 19.5 Material kinds and properties

Every material (stone kinds, wood, fibre, soft material, carcass parts, later substances) has a content-declared **material kind** with two property sets:

- **Perceptible properties** (glassy, fibrous, hard, soft, edible-looking, wet) observed on sight with the ordinary perception law;
- **Trial-revealed properties** (flakes to an edge, holds a twist, preserves when dried) that become known only through an outcome observed in a trial or use (§13.5), a demonstration, or a transmitted record.

Method schemas declare trigger signatures over these properties (§21.1). Public model knowledge declares which operation families are compatible with which perceptible property classes ("hard things can be struck"); it never declares what any combination yields.

#### 19.6 Carrying capacity is measured, not assumed

Renewal ceilings constrain population; there is no demographic target. Initial stocks are a finite endowment, not income. Evaluator-only arithmetic (renewal bounds, achievable harvest, demand) is diagnostic (§38.5) and never visible to minds.

### 20. Goods, custody, claims, reservations, items and contested transitions \[II distinctions; V values\]

**All material things use one goods model: located containers hold quantities of typed goods and individual items; claims say who is recognised as entitled to them; custody says who physically manages them; reservations earmark them; debts record liabilities without being goods.** No good has its own storage architecture. A new good is a content entry.

#### 20.1 Definitions

| Term | Meaning | Is it goods? |
| --- | --- | --- |
| Quantity | Physical amount of a good in a container | Yes |
| Location | Where a container is; a carried or nested container is wherever its carrier chain is | — |
| Custody | Who physically manages a container or item | No |
| Claim | A recognised entitlement to part of a container's backing: beneficiary, object, quantity, scope, basis, and the recognising parties | No |
| Reservation (lease) | An earmark of an existing backed balance, item or person's time for a specific use, with expiry | No |
| Unbacked or disputed claim | An entitlement whose goods no longer exist or are held by someone who does not recognise it (after spoilage, contested taking or occupation) | No; it cannot be spent |
| Debt | A liability of a debtor to a creditor; secured debt references specific collateral without copying its quantity | No; unsecured debt is not food |
| Access right | Law-specific permission, such as an office's scope to allocate a communal store | No |

Depositing changes custody, not ownership. Inheritance changes beneficiaries, not location. Ownership never implies physical control.

#### 20.2 Goods and items as content \[V\]

Each good kind declares bulk (CU per unit), divisibility, material kind (§19.5), spoilage rate per storage kind, and the operations that produce or consume it.

| Good | Bulk (CU per unit) | Notes |
| --- | --- | --- |
| Food | 1 | Spoils (§20.3) |
| Wood | 0.20 |  |
| Stone | 0.40 | By deposit material kind |
| Soft material | 0.10 | Fibre, hide |
| Equipped tool / weapon / protection | 0.10 / 0.15 / 0.10 | Items |
| Carried child | 0.20 + 0.80 m(a) | Not a good; uses cargo capacity |

**Items** are individual records: type, quality Q ∈ \[0.4, 2.5\], durability d ∈ \[0, 1\], maker, holding container, claims. A person equips at most one tool, one weapon and one protection. Only the relevant equipped item applies to an operation; hunting does not stack tool and weapon effects.

#### 20.3 Storage kinds \[V\]

| Storage | Capacity | Food spoilage | Notes |
| --- | --- | --- | --- |
| Carried | Person's cargo limit | 0.35 per SD | Load slows movement |
| Simple cache | 12 CU | 0.20 per SD | 0.02 work-SD to establish; discoverable, stealable; no territory |
| Constructed store | 80 × integrity CU | 0.06 per SD while functional | Built structure (§21); excess spills once to an exposed pile |
| Carcass or exposed pile | Its own contents | 3 per SD | Must be processed or moved promptly |

Spoilage is exponential and destroys goods and their backed claims pro rata; reservations shrink with it. Half-lives are about 2.0, 3.5 and 11.6 SD for carried, cached and stored food. A structure below 0.25 integrity loses its special effects; its food spoils as an exposed pile until moved. **Every storage is a world entity**: it survives its creator's death, can enter an estate, can be found and can be contested.

#### 20.4 Cargo \[V\]

Nominal capacity C\_nom = 1.5 s\_carry X\_B m(a) CU, with s\_carry = 1 for M and 0.60^(d\_sex) for F; m(a) is juvenile size (§23.4). The hard maximum is 2 C\_nom. One nominal load halves travel speed (§8.4).

#### 20.5 Containers, nesting and vehicles

Containers have a location or carrier, capacity, access conditions, custodian and contents, and must not form cycles. A carried container or vehicle includes its own load and contents in capacity and movement accounting; the location of contained goods derives through the chain, never from independent coordinates. A later vehicle law adds propulsion, navigability, crew and passenger positions; every person aboard keeps their own ledger, assent and exposure.

#### 20.6 The ledger and transaction kinds

The goods ledger is the sole writer of quantities, custody, backing, reservations and claim backing. Every transaction is atomic and validates co-location or carrier chain, physical access, capacity, unreserved balance, causal time and a valid **transaction kind**: extraction, production, consumption, recipe input, spoilage, damage, own or claim use, consensual transfer, scoped-authority allocation, estate distribution, or contested taking (§16.7). For every container and globally:

```latex
\text{opening} + \text{production} + \text{ecological and carcass sources} + \text{arrivals} = \text{closing} + \text{departures} + \text{consumption} + \text{recipe inputs} + \text{spoilage} + \text{damage}
```

Spendable backed claims plus explicitly unclaimed remainder equal physical quantity. Rival unbacked claims are stored separately and cannot be spent. Atomic swaps require both actual lots and assent; distant deliveries are separate transactions with risk. Conservation is checked with declared numerical tolerance; numerical corrections never mint replacement backing.

#### 20.7 Contested transitions

A contested taking moves physically accessible goods under the contest or appropriation law: possession and backing move with the goods; prior claimants' backed claims on that quantity become disputed historical claims, retained with provenance; finite backing stays conserved; witnesses receive evidence; no consent is created or retroactively inferred. Recovery, compensation or sanction are later ordinary choices by whoever pursues them. Occupation (§37.3) changes custody of located assets the same way, not recognised ownership.

#### 20.8 Numeraire, money and credit

Food serves as the transferable numeraire for valuing offers because it is universally useful (§28). There is no global market or price. Money, when introduced, is either a token good (content) or a claim token whose acceptance is a recognised social fact held by particular people; credit, settlement and collateral are debt records under declared laws. Belief that a token will be accepted is neither a global price nor material backing. None of these needs a new ledger.

### 21. Transformations, material effects and work-in-progress \[III schema; V content\]

**A recipe declares how paid work at a place turns inputs into outputs. One schema covers extraction, making, building, repair, processing, practice and the resolution of trials. A recipe never contains a person-selection loop or a callback.**

#### 21.1 The recipe and method schema

| Field | Meaning |
| --- | --- |
| Inputs and schedule | Goods consumed, with quantities and when they are consumed (at start, progressively, at completion) |
| Tools and facilities | Required equipped items or structures, and their effect adapters |
| Site | A resource site kind, a facility, or anywhere |
| Trigger signature | The operation family and the material-property, tool and site conditions under which this schema's effect occurs (§19.5); used by the material-effects law to resolve trials and ordinary work alike |
| Roles | Participating roles and their coupling, if more than one person (§28.3) |
| Work law | Reference work in work-SD (scaled by task expression, §24.3), or a resource rate |
| Practice shares | How participating time teaches the five masteries (§24.2) |
| Output law | Goods, an item with quality, a structure, a container, a revealed property, or a state change on a site, via a registered effect adapter |
| Gates | Eligibility conditions (minimum mastery for quality tiers, age scope, facility integrity) |
| Observable results | What participants and onlookers perceive, including which properties the outcome reveals |

Estimation and execution read the **same schema** through different providers: a mind's forecast uses its own rate estimates, believed availability and its provisional or established method record; execution uses actual inputs, true material properties and actual capability.

#### 21.2 Work-in-progress

Starting a recipe that takes time creates a **work-in-progress record in the world** at its location: progress, consumed inputs, recoverable remainder, contributors with contribution-weighted competence, the held quality draw, and rights. Interruption, abandonment or the maker's death leaves it in place. Anyone with access and the method may later continue it; ownership follows the declared claims. Consumed inputs are never refunded. Default portable-item inputs are consumed at assembly start; progress remains located thereafter.

#### 21.3 Quality \[V\]

Target quality Q is chosen from {0.75, 1, 1.5, 2, 2.5}. Work required is L₀Q². Q > 1 requires mastery x\_Make ≥ 0.20; Q > 2 requires x\_Make ≥ 0.60 and an intact workshop. Optional preparation p ∈ \[0, 1\] consumes p × base materials and p L₀ extra work. On completion:

```latex
Q_{actual}=\mathrm{clip}\big[\min(Q_{target},K_{Make})(1+0.15p)\,s_{site}\,(0.90+0.20U)+\Delta Q_{input},\;0.4,\;2.5\big]
```

with s\_site = 1 in a usable workshop and 0.85 elsewhere, K\_Make the contribution-weighted competence of the actual makers, ΔQ\_input any declared input-quality effect (zero for founding inputs), and U one keyed completion draw bound to the work object, which stopping, splitting, renaming or restarting cannot reroll.

#### 21.4 Founding recipes \[V\]

| Product | Inputs | Base work (work-SD) | Effect |
| --- | --- | --- | --- |
| Work tool | 1 wood, 1 stone | 0.08 | Relevant extraction output × (1 + 0.30 Q d) |
| Weapon | 2 wood, 2 stone | 0.15 | Fight and hunt force × (1 + 0.40 Q d) |
| Protection | 2 soft, 1 wood | 0.15 | Injury hazard ÷ (1 + 0.50 Q d); exposure protection |
| Cache | none | 0.02 | Creates a 12 CU cache |
| Store | 10 wood, 5 stone | 1.6 | 80 CU storage, slow spoilage |
| Workshop | 8 wood, 4 stone, 4 soft | 1.2 | Craft and teaching site; quality tiers |
| Outpost | 5 wood, 10 stone | 2.0 | Staffed sight 1 km; defensive factor up to 1 + 0.4 × integrity |

Extraction recipes (gather, wood, stone, fibre, fish, hunt) and carcass processing use the rates in §24.3. Equipped items lose 0.04 durability per relevant active work-SD; unused items do not wear. Repair restores lost durability for proportional materials and work. Structures lose 0.003 integrity per SD; below 0.25 their special effects cease and contents remain. The scenario also declares a small set of method schemas that founders do not know (§47.6), so that actor-relative discovery is possible in the canonical world.

#### 21.5 What is not a recipe

| Process | Why it is not a recipe | Where it lives |
| --- | --- | --- |
| Pregnancy, birth, development, healing, ageing | Biological processes with hidden state, not chosen work | Biology and physiology laws (§22, §23, §31) |
| Learning | A law over practice time, not a product | Learning law (§24.2); practice recipes only schedule the time |
| Care of dependants | A responsibility with continuity rules; its work uses the care law | Care law and relation records (§29) |
| Recognition, office, ownership | Social facts held in people's beliefs and in social records | Social protocol and relation laws (§26–§27, §34–§35) |
| Contests, conquest and contested taking | Force- or access-resolved outcomes between independent parties | Contest law (§37) and contested transitions (§20.7) |
| Ecological renewal | Not produced by anyone | Ecology law (§19) |

A recipe can never create a person, consent, a claim, a recognised office or a mate.

#### 21.6 The material-effects law

The material-effects law resolves every Work operation that applies an operation family to a target: it matches the operation, the target's true material properties, the equipped tool and the site against the trigger signatures of the implemented schemas and applies the first match by a fixed specificity order (most specific signature first, ties by content ID). Ordinary work under a known method resolves the same way. A trial (§13.5) is simply such an operation where the actor does not know which schema, if any, will match; a matching schema yields its outcome at the trial yield factor, and a non-match yields the operation's declared null outcome and any revealed properties. The law reads truth and writes only physical outcomes; the evidence service alone decides what the actor learns from them.

### 22. Physiology: food, condition, fatigue, enjoyment, wounds and ageing \[II laws; V values\]

**Bodies need food in proportion to their size, capacity and effort; condition responds to intake with finite starvation time; rest and enjoyment follow the time actually spent, settled at canonical closures.** All laws are anchored analytic laws (§9.2–§9.3).

#### 22.1 Requirement

With age factor a\_f = 0.25 + 0.75 m(a), class factor s\_M = 1, s\_F = 0.85, developed capacities X (§23), efficiency E, and activity fractions u\_j:

```latex
M = 0.45 + 0.25X_B^2 + 0.08X_A^2 + 0.12X_C^2 + 0.10X_P^2 + 0.05[U_v-1]_+^2
```

```latex
R = B_0\,s_{class}\,a_f\Big[\tfrac{M}{E} + E^2\sum_j \ell_j u_j + 0.20\,\mathbf{1}_{pregnant} + 0.15\,\mathbf{1}_{post\text{-}birth} + 0.30w\Big] + R_{exposure}
```

B₀ = 1 FU/SD; R is a rate in FU/SD. The quiet requirement rate is B\_quiet = B₀ s a\_f M / E. Minds never read it: each person estimates their own quiet requirement from experience (§10.3). High developed capacity is costly to maintain; efficiency lowers quiet cost and raises the cost of intense work.

| Activity | Metabolic load ℓ | Fatigue weight a |
| --- | --- | --- |
| Rest, passive leisure | 0 | 0 |
| Care, socialising, administration, eating, teaching | 0.10 | 0.10 |
| Stationary watch | 0.15 | 0.30 |
| Gathering, fishing, fibre, light trials | 0.20 | 0.40 |
| Loaded travel, hauling | 0.35 | 0.70 |
| Heavy extraction, craft, building | 0.55 | 0.70 |
| Hunting, patrol | 0.75 | 0.80 |
| Fighting | 1.00 | 1.00 |

Travel uses the travel load whatever its purpose. In designated exposed cells, R\_exposure = 0.10 B\_quiet u\_exposed / (1 + 0.5 Q d\_protection); mild basins add zero.

#### 22.2 Condition and starvation

Intake coverage n = intake rate / requirement rate over a held segment sets target condition:

```latex
C(n)=\begin{cases}2n^2/(1+n^2), & 0\le n\le 1\\ 1+\varepsilon(n-1)/(k+n-1), & n>1\end{cases}\qquad \varepsilon=0.20,\;k=1
```

Condition relaxes toward C(n) with τ = 0.35 SD when falling and 0.70 SD when rising, exactly under piecewise-constant intake and requirement, re-anchored at genuine boundaries (§9.3). Starvation hazard h = 4(\[0.35 − c\]₊/0.35)² per SD, integrated analytically through entry into and recovery out of the region below 0.35. Without food, condition falls from 1 to 0.35 in about 0.37 SD; death after that is stochastic, never automatic at a missed meal. Condition affects output with exponents 1 (combat), 0.7 (field), 0.4 (craft), 0.3 (coordination); it never changes genes or stored mastery. Above-normal condition is expensive: c = 1.10 needs n = 2 and c = 1.15 needs n = 4. Consumption for actual elapsed activity closes exactly once even if a task is interrupted; displayed meals are representations of debits, not additional food.

#### 22.3 Wounds

New injury adds 0.20 + 0.40U (keyed), capped at 1. Wounds heal at ẇ = −min(n, 1)/2 per SD. At w = 1 active work and force are zero; supplied healing continues.

#### 22.4 Mortality and pregnancy loss

- **Age hazard:** h\_age(y) = \[0.003 + 0.008 e^((y − 50)/10)\] / 12 per SD, y in years. A broad old-age tail; no fixed lifespan.
- **Starvation:** §22.2. **Combat and injury death:** from the contest law (§37.2).
- **Pregnancy-loss hazard:** 0.30 (\[0.6 − c\]₊/0.6)² per SD while pregnant, with one hazard budget per pregnancy episode. A crossing ends the pregnancy (§31.2); it is not a cause of the mother's death. The baseline has no childbirth-specific maternal mortality.
- **Hazard budgets** are consumed by accrued hazard, crossings are scheduled analytically, and interruptions or inspection never reroll survival. Causes compete through their actual event times.

The baseline has no disease or inbreeding-depression law; either would be a new law (§41).

#### 22.5 Fatigue

At each representative closure, from the closed interval's accumulators (§9.3), with fatigue weights a\_j from §22.1, fractions u\_j = accumulated time / interval duration, and L = Σ a\_j u\_j:

```latex
d_*=\mathrm{clip}\big[(0.30+0.12L-u_{rest})/0.20,\,0,\,1\big],\qquad d'=d_*+(d-d_*)e^{-\Delta/\tau_d}
```

Δ is the interval duration; τ\_d = 1 SD if d\* > d (accumulating), else 0.5 SD (recovering), chosen once per closure. Fatigue held from the last closure multiplies physical work, movement and force by 1 − 0.20d, coordination by 1 − 0.15d and craft by 1 − 0.10d; care uses its own quality law. Rest that was planned but not taken never enters an accumulator.

#### 22.6 Enjoyment and experienced process value

Enjoyment satisfaction f ∈ \[0, 1\] is recent leisure satisfaction, not happiness, morale or energy. It is governed by one law for every discretionary activity family, so that no activity is rewarded by its label.

**Pleasant weight.** Each moment of discretionary, safe activity a in family F has pleasant weight

```latex
\pi_a = \frac{w_F\,\big[1+\kappa_F\,\nu_a\,(1-\phi_c)\big]}{1+\kappa_{sat}\,S_F}
```

| Symbol | Meaning |
| --- | --- |
| w\_F | Family base weight: leisure 1; voluntary social 1; romantic 0.7; safe discretionary exploration (voluntary inquiry and trials) 0.3; juvenile play 1 |
| κ\_F | Family sensitivity to unfamiliarity: leisure 0.2; voluntary social 0.2; romantic 0; exploration 1.5; play 0.5 |
| ν\_a | Experienced unfamiliarity 1 − n/(n + 3), where n is the person's own decaying exposure count (τ = 36 SD) to the activity's semantic descriptor (target kind, place block, operation); renaming an activity does not change its descriptor |
| φ\_c | Frustration in trial context c: fails/(fails + 2), with unrewarded trial outcomes decaying at τ = 24 SD; zero for non-trial families |
| S\_F | Family satiation, held from the last closure; at each closure S′ = S e^(−Δ/3 SD) + (u\_F/0.12)(1 − e^(−Δ/3 SD)), with u\_F the family's pleasant-time fraction in the closed interval |
| κ\_sat | 0.5 for every family |

Compulsory work, dangerous scouting, craft and training earn no pleasant weight. Each moment takes only its largest applicable weight. Voluntary juvenile play also counts as practice (§24.6), using the larger weight once.

**Dynamics.** At each closure, with u₊ = ∫π dt / Δ, v = min(1, u₊/0.12), and q the union fraction of compulsory service, danger or emergency deprivation:

```latex
\dot f = 1.5v(1-f)-\rho f,\quad \rho = 0.08+0.12q,\quad f_*=\frac{1.5v}{1.5v+\rho}
```

f relaxes exactly toward f\* over the interval. The mind values relief of (1 − f)² (§12.5), forecasting its own satiation, familiarity and frustration, which it knows exactly as experienced state. Enjoyment never directly changes strength, genotype, competence or output. No term depends on true hidden novelty, discovered-object count, map coverage or eventual usefulness. A declared variant may set the exploration weight and all κ\_F to zero, removing non-instrumental exploration.

#### 22.7 Representative daily life \[VII\]

A feasible adult representative day might be rest 0.30, maintenance 0.04, travel 0.08, production 0.40, care 0.06, social and leisure 0.08, training or trials 0.04. Dependants, wounds, wealth, danger, duties, projects and satiation change every allocation.

## Part V — Biology and capability

### 23. Genetics and development \[II structure; V values\]

**Each person inherits seven diploid factors from their true parents; childhood food, care and experience determine how much of that potential is structurally realised; development freezes at adulthood.** Neither genes nor development are ever visible to minds.

#### 23.1 Inherited factors

Each person has two alleles at each of seven factors (q, δ\_B, δ\_A, δ\_C, δ\_P, e, v), plus a display marker θ and a preference marker ψ (angles). With pair means (bars), L = ln 3 and P(z) = exp\[L tanh(z/L)\]:

```latex
U_j = P(\bar q + \bar\delta_j),\; j\in\{B,A,C,P\};\qquad U_v = P(\bar v);\qquad E = 1 + 0.20\tanh\bar e
```

- U\_B, U\_A, U\_C, U\_P are potentials for bodily strength, agility, cognition and personal or social capacity, each smoothly between 1/3 and 3.
- q is general capacity and enters the four potentials once. It does not separately raise fertility, attraction, healing or learning speed.
- U\_v is raw display; E (0.8–1.2) is metabolic efficiency and does not also multiply output.
- Domain deviations allow specialists; there is no fixed total capability.

**Founders \[V\]:** zero-mean Gaussian alleles; q SD 0.25; each δ SD 0.25 with pairwise correlation −0.20 within a homologue's deviation vector; e SD 0.60; v SD 0.40; homologous draws independent; θ and ψ independent uniform angles. M and F distributions are identical; no sex-specific truncation of exceptional potential exists.

**Transmission \[II mechanism; V rates\]:** at each factor independently, one allele comes from each true genetic parent. Each transmitted allele mutates with probability 0.02, Gaussian increment SD 0.08 (q, δ, v) or 0.15 (e). θ and ψ each come from one parent with wrapped Gaussian mutation SD 0.05 radians. Mutation is per transmission. Parental development, mastery, wealth and status never enter genes. There is no hidden regression to a founder mean; regression arises only from segregation, mixing and non-inheritance of acquired advantage. The pre-mutation child pair-mean variance for parental alleles (a, b) and (c, d) is \[(a − b)² + (c − d)²\]/16 around the mid-parent value.

#### 23.2 Development

Let age in SD be a and maturity T\_m = 216 SD. Two exposure integrals accumulate until maturity, then freeze:

```latex
A_s(a)=\int_0^{\min(a,T_m)} w_s(t)\,E_s(t)\,dt,\qquad D_s = A_s \Big/ \int_0^{\min(a,T_m)} w_s(t)\,dt
```

Physical weights are 2 before 72 SD and 1 afterwards; mental weights are 1 then 2. **Newborn convention:** at a = 0 the integrals are zero and D\_s is defined as 0; the ratio formula applies for a > 0. Integrals are incremented once per closed representative interval of the child, with intervals split canonically at 72 SD and 216 SD (§9.3). Developed capacities:

```latex
X_B=U_B(0.40+0.60D_{phys}),\; X_A=U_A(0.40+0.60D_{phys}),\; X_C=U_C(0.30+0.70D_{mental}),\; X_P=U_P(0.30+0.70D_{mental})
```

Poor childhood can outweigh genetic advantage: U\_C = 2 with D = 0.2 gives X\_C = 0.88, below a fully realised ordinary capacity of 1.

#### 23.3 Developmental exposure

For each closed interval of the child:

- **Nutrition.** Private target n\_dev = 1 + 0.60 sat(\[GM(U\_B, U\_A, U\_C, U\_P) − 1\]₊); coverage N = min(1, n / n\_dev), with n = interval intake / interval ordinary requirement. Caregivers never see n\_dev; they choose feeding tiers from observed growth and means (§29.3).
- **Care.** Required adult care per child, piecewise linear in age: 0.24 work-SD/SD at birth, 0.16 at 2 years, 0.08 at 6, 0.025 at 12, 0 at 18. Caregiver quality q\_care = clip(0.5 + 0.5√K\_Social, 0.5, 1.5) min(c, 1)^0.3 (1 − w)^0.2. Coverage C\_care = min(1, Σ u\_gk q\_care,g / T\_care,k), with each adult's time divided among the children actually attended. **When required care is zero, C\_care = 1.**
- **Safety.** S = clip(1 − u\_forced flight or attack, 0, 1)(1 − w\_child).
- **Meaningful interaction.** X\_exp = clip(0.5 + 0.5 u\_positive / 0.15, 0.5, 1), from actual interaction or supervised practice in the child's ledger.

```latex
E_{phys}=N^{0.65}C_{care}^{0.25}S^{0.10},\qquad E_{mental}=N^{0.35}C_{care}^{0.45}X_{exp}^{0.20}
```

Neglect, hunger and displacement accumulate permanent effects; later abundance does not rewrite earlier exposure. A single legitimate interaction can provide care, exposure and learning while paying its time once. Biological motherhood carries no special care multiplier; accepted substitutes can meet needs.

#### 23.4 Juvenile size

m(a) = min(1, a / 216 SD)^0.75 scales food requirement (§22.1), cargo (§20.4), juvenile movement (speed × √m) and direct strength inputs to juvenile work (§24.5). It is used nowhere else.

#### 23.5 Birth conventions \[V\]

Genes come from the true parents; class is an independent equal-probability draw. A newborn starts with c = min(1, c\_mother), w = d = 0, f = 0.5, zero integrals, zero mastery, an empty repertoire, and the experienced state of an infant. These are conventions, not inherited acquired traits.

### 24. Mastery, learning, teaching, cultural transmission and realised performance \[II structure; V values\]

**Mastery is learned only through practice; methods are learned through trials, demonstration, teaching and reports; competence combines developed capacity with mastery; realised output combines competence with body state, equipment and site.** Knowing a method and being good at it are different records. Learning is a side effect of paid activity recorded by the runtime for every step, so no capability needs its own learning code.

#### 24.1 Competence

Five masteries x\_k ∈ \[0, 1): Field, Fight, Make, Organise, Social. Competence K\_k = L\_k (0.12 + 0.88 x\_k) / 0.56 with L\_k = GM(X; w\_k):

| Competence | X\_B | X\_A | X\_C | X\_P |
| --- | --- | --- | --- | --- |
| Field | 0.10 | 0.30 | 0.50 | 0.10 |
| Fight | 0.20 | 0.40 | 0.30 | 0.10 |
| Make | 0 | 0.25 | 0.65 | 0.10 |
| Organise | 0 | 0.05 | 0.50 | 0.45 |
| Social | 0 | 0 | 0.30 | 0.70 |

Ordinary capacity with x = 0.5 gives K = 1; an untrained ordinary person has K ≈ 0.214.

#### 24.2 Learning law

```latex
\dot x_k=\Lambda_k(1-x_k)^2,\qquad \Lambda_k=\frac{u_k\,\min(c,1)^{0.5}(1-w)^{0.25}(0.75+0.25\,s_{useful})\,M_{mentor}\,T_{transfer}\,P_{age}\,\eta}{12\ \text{SD}}
```

- u\_k is practice work-SD per SD in domain k; each step's time is divided by its recipe's practice shares and never exceeds participating time.
- s\_useful ∈ \[0, 1\] is useful completed performance; failure still teaches at 75%. Trials teach their operation's domains like any work.
- **Transfer** T = 1 + 0.30 Σ T\_kj x\_j with symmetric entries Field–Fight 0.5, Field–Make 0.2, Fight–Organise 0.3, Make–Organise 0.3, Organise–Social 0.4.
- **Mentorship** M = 1 + 1.5 \[x\_mentor − x\_learner\]₊ a\_teach. Deliberate teaching costs 0.15 mentor work-SD per learner practice-SD at a\_teach = 1; nearby co-work observation supplies a\_teach ≤ 0.15.
- **Childhood plasticity** P\_age = 1 + 0.5\[1 − clip((a − 3)/15, 0, 1)\], a in years (1.5 at 3, 1 from 18). No deliberate practice before age 3.
- **Activity effectiveness** η = 1 for genuine work and structured training; 0.5–0.6 for play (§24.6).

With Λ held over a work segment, the closed form 1/(1 − x′) = 1/(1 − x) + ΛΔ commits at the segment's end, interruption or a representative closure (§9.3); updated mastery affects later work only. There is no adult skill decay; cultural loss comes from death, migration and interrupted teaching. At ideal unmentored practice from zero, x = 0.2 / 0.5 / 0.8 / 0.9 takes 3 / 12 / 48 / 108 practice-SD.

#### 24.3 Task expression

For task t, ability is a weighted geometric mean of developed capacities and competences, times a class expression factor s\_t for F (s\_M = 1; s\_F = s\_t^(d\_sex), d\_sex = 1 by default):

| Task | Ability weights | F ratio s\_t | Condition / wound exponents | Reference rate; practice shares |
| --- | --- | --- | --- | --- |
| Gather | X\_B 0.25, X\_A 0.20, Field 0.55 | 0.62 | 0.7 / 1 | 6 FU/work-SD; Field 1 |
| Fish | X\_A 0.15, Field 0.75, Make 0.10 | 0.70 | 0.7 / 1 | 5 FU/work-SD, compatible tool required; Field 0.9, Make 0.1 |
| Scout, search | X\_A 0.20, Field 0.65, Organise 0.15 | 0.65 | 0.7 / 1 | Searched route; Field 0.8, Organise 0.2 |
| Hunt | X\_B 0.15, X\_A 0.20, Field 0.40, Fight 0.25 | 0.52 | 1 / 1 | Prey objective; Field 0.6, Fight 0.3, Organise 0.1 |
| Wood | X\_B 0.35, X\_A 0.10, Field 0.30, Make 0.25 | 0.55 | 0.7 / 1 | 4 units/work-SD; Field 0.5, Make 0.5 |
| Stone | X\_B 0.40, X\_A 0.10, Make 0.50 | 0.50 | 0.7 / 1 | 3 units/work-SD; Make 1 |
| Fibre | X\_A 0.20, Field 0.60, Make 0.20 | 0.78 | 0.7 / 1 | 4 units/work-SD; Field 0.7, Make 0.3 |
| Craft | X\_A 0.15, Make 0.80, Organise 0.05 | 0.82 | 0.4 / 0.7 | Recipe work; Make 0.9, Organise 0.1 |
| Build or major repair | X\_B 0.25, X\_A 0.10, Make 0.55, Organise 0.10 | 0.57 | 0.7 / 1 | Recipe work; Make 0.8, Organise 0.2 |
| Fight | X\_B 0.25, X\_A 0.20, Fight 0.55 | 0.50 | 1 / 1 | Concurrent force; Fight 0.9, Organise 0.1 |
| Command fighters | Fight 0.35, Organise 0.50, Social 0.15 | 0.65 | 0.3 / 0.4 | Attention; Organise 0.6, Fight 0.25, Social 0.15 |
| Lead hunters | Field 0.40, Organise 0.45, Social 0.15 | 0.75 | 0.3 / 0.4 | Attention; Organise 0.6, Field 0.25, Social 0.15 |
| Lead workshop | Make 0.40, Organise 0.45, Social 0.15 | 0.90 | 0.3 / 0.4 | Attention; Organise 0.6, Make 0.25, Social 0.15 |
| Administer, allocate | Organise 0.55, Social 0.30, Make 0.15 | 1 | 0.3 / 0.4 | Decisions; Organise 0.55, Social 0.35, Make 0.10 |
| Haul, travel | X\_A 0.25, Field 0.50, Organise 0.25 | 0.65 | 0.5 / 0.5 | Movement law; Field 0.7, Organise 0.3 |
| Care, teach | Social and Organise, with the relevant competence | 1 | Dedicated laws | Social 0.7, Organise 0.2, relevant 0.1 |

The stronger command expression applies only to armed enforcement and combat command, never to management, bargaining, ownership or appointment.

#### 24.4 Realised output

```latex
z = Y_{0t}\,u\,\Delta t\;A_t\;c^{\alpha_t}(1-w)^{\omega_t}\,F_t(d)\,E_{item,t}\,Z_{site,t}\,\chi_{method}
```

Hard material, access, facility and role gates apply first; a geometric-mean floor never substitutes for a missing input. χ\_method is 1 for an established method and the declared trial or provisional-method factor while a method is unpractised (§47). Each factor applies once.

#### 24.5 Juveniles

- **Participation** J(a) = \[clip((a − 6)/12, 0, 1)\]^0.8, a in years, is the productive fraction of an occupied juvenile work block (0 at 6, 0.574 at 12, 1 at 18). The whole block is still spent; J discounts contribution, not time, food, practice or cargo carried.
- **Size.** Direct strength inputs use m X\_B; output z\_juvenile = J m^(w\_B) z\_base, applied once.
- **Scope by age:** 0–2 care, play, observation; 3–5 supervised skill-building play; 6–9 safe supervised gathering, household and workshop help, tiny hauling; 10–13 gathering, simple processing, light hauling, sibling help, safe local scouting, structured training; 14–15 substantial ordinary work and low-risk hunt support; 16–17 most ordinary production and ordinary-prey hunting; 18 full adult eligibility. Dangerous prey, predator clearing and planned armed action are adult-only. Capable juveniles may flee or defend themselves using size-adjusted Fight without J.
- **Supervision** below age 14 requires co-located adult time ν(a) u\_child with ν(a) = 0.10 clip((14 − a)/4, 0, 1); overlapping care or teaching can satisfy it within the same interaction. From age 10, sibling help supplies J q\_care u effective care; an adult remains responsible, and care of an under-six child requires an adult on site.
- Juveniles cannot independently accept unrestricted external commitments; a responsible adult authorises participation within age scope, and the child's output is a recorded contribution, never unrecorded adult property.

#### 24.6 Childhood practice mappings \[V\]

| Activity | Practice shares | η |
| --- | --- | --- |
| Play fighting | Fight 0.85, Field 0.15 | 0.50 |
| Running, chasing, throwing | Field 0.80, Fight 0.20 | 0.50 |
| Tracking, mock hunting | Field 0.80, Fight 0.15, Organise 0.05 | 0.60 |
| Workshop play or assistance | Make 0.90, Organise 0.10 | 0.60 (play); 1 (genuine participation) |
| Helping organise shared activity | Organise 0.40, Social 0.60 | 0.50 |
| Social play | Social 1 | 0.50 |

Voluntary play counts as leisure under the play family (§22.6) and as practice in the same block, using the larger enjoyment weight once.

#### 24.7 Method knowledge, teaching and cultural transmission

A known method (§12.3) carries confidence κ\_m ∈ (0, 1\] and believed parameters. Acquisition routes and their baseline semantics:

| Route | Installs | Initial confidence and fidelity |
| --- | --- | --- |
| Founding culture | Established methods | κ\_m = 1; exact parameters |
| Own successful trial | Provisional method from the observed outcome | κ\_m = `P.culture.trialConfidence`; observed parameters |
| Demonstration (observed use with visible result) | Technique hypothesis; becomes provisional after own success | Hypothesis only |
| Deliberate teaching (Attend with mentorship, ≥ `S.culture.teachTime` of joint time per method) | Provisional method | κ\_m from teacher's relevant competence and learner's X\_C (§47); parameters copied with keyed fidelity noise |
| Report or record describing a technique | Technique hypothesis | Fidelity from detail, source reliability and channel |

Confidence rises toward 1 with each successful own use (κ′ = 1 − (1 − κ) × `S.culture.confirmRate`) and falls in the failing context. Provisional methods bind with widened estimates and the provisional output factor. Teaching a method also delivers mentorship to practice in its domains. Mentorship is a commitment (§28.6) or an unpaid service within a household or group. Workshops are natural teaching sites. Methods held by no living person are lost until rediscovered; access to teachers is a channel of cultural and opportunity inheritance (§32.1).

## Part VI — Social life

### 25. Ties, observation and reputation \[II structure; V values\]

**A tie is one person's evidence about another: what they have experienced from them, what they have seen them do, and how reliable they have proved.** There is no global reputation score. Reputation is the distribution of other people's ties, built from attributed observation and reports.

#### 25.1 The tie record

A directed tie from i to j holds positive experience b and harmful experience h, each in \[0, 1\] with timestamps; last actual positive-service time; observed phenotype, location and affiliation at last sighting; a few dated task-performance samples per domain; observed consequential success π (§30.3); response history to proposals (accepted, refused, fulfilled, breached, excused), decaying with τ = 12 SD; observed methods j has been seen using; and reliability as a source of reports (§11.4).

Discretionary ties are bounded (`P.mem.ties`). Ties to household members, dependants, carers, mentors, commanders, active counterparties, institutional superiors and unresolved disputes are pinned. Evicting a tie leaves a durable precedent summary (accumulated b, h, π and breach count) and never erases an obligation, a grievance or durable reproductive history.

#### 25.2 Experience dynamics \[V\]

b and h decay with τ\_rel = 36 SD. At an attributed helpful event of usefulness U (in the recipient's quiet-food-SD equivalents) or harmful event of magnitude V:

```latex
b \leftarrow 1-(1-b)e^{-U/3},\qquad h\leftarrow 1-(1-h)e^{-V/3}
```

- Useful food is valued by u(n) = min(1, n) + 0.25\[C(n) − 1\]₊/ε (enhancement term zero if ε = 0), crediting only the marginal useful increment the delivery caused. Sponsor and courier shares sum within that amount; an unknown sponsor earns nothing.
- Delivered care, teaching, protection and honoured access create b; attacks, confiscation, observed contested takings and knowingly broken commitments create h. Unattributed misfortune creates neither; an observed excused failure (evident injury, observed impossibility) is not treated as betrayal.
- Voluntary reciprocal socialising produces 0.4 recipient-equivalent units per work-SD, divided among actual partners.
- Promises, announcements and discarded gifts earn nothing.
- Both b and h can be high at once: a benefactor who also harms is not a stranger.

Provisioning history used by readiness (§30.5) decays with τ = 3 SD, with self-produced food in the denominator. Inactive ties decay lazily on use; reading a tie never refreshes it.

#### 25.3 Observation of others

People learn about others only from sampled observations and reports: noisy dated display and health, approximate age and class, observed task performance, observed methods in use, location and affiliation when seen, reported plans and actual proposals. They never read private preferences, dispositions, readiness, satiation, repertoire, hidden obligations, exact skills, unseen location or pregnancy before evidence. Performance samples estimate a task bundle (person, task, visible equipment and body context, realised performance, paid duration), not hidden competence. A newly observed person gets the public prior K = 1 with broad uncertainty (log SD 0.7), adjusted once for publicly observed class expression.

#### 25.4 Recognition is held by people

Whether someone is a recognised father, an office holder, the rightful claimant of a store or a member of a group is a **social fact**: a recognition event recorded by the social protocol under a relation law, and held as belief by the particular people who witnessed it, were told of it, or read of it. Each person's recognitions can differ from others'. Every recognition has an **audience**; the whole world does not automatically know it. This is what lets legitimacy, dispute and collapse emerge.

#### 25.5 Social settings

Socialising near a camp, fire, store or settlement is an ordinary allocation choice. Shared location supports conversation, information, teaching, recruitment, alliance maintenance, household continuity and romantic exposure. Attention is finite: a crowd does not create a complete conversation graph. A consequential event (a successful hunt, a birth, a completed store, a discovery) may issue one local invitation to gather; attendance is chosen normally and creates no free time, food or relationship updates.

### 26. Social records and transactions \[III lifecycle; II meanings\]

**Social meaning has several distinct origins, and not everything begins with a contract handshake. Where agreement is involved, assent attaches to an exact version of terms, reservations are finite and leased, commitment is atomic where people are together and communicated where they are apart, and obligations outlive the tasks that perform them.** No hidden solver ever inspects private schedules or stocks to manufacture a feasible group plan.

#### 26.1 Origins of social meaning

| Kind | Created by | Binds | Assent required | Survives |
| --- | --- | --- | --- | --- |
| **Agreement** | Acceptance of one exact proposal version by every committed party | The committed parties | Each committed party | Per its terms, exit or breach |
| **Care responsibility** | Birth (maternal side), accepted recognition, accepted substitution or guardianship | Carer toward dependant | The carer, except maternal responsibility at birth | Adult separation and unrelated expiries; ends at maturity, death, accepted reassignment, or explicit abandonment with consequences |
| **Biological relation** | Biology laws | Nobody; a hidden fact | — | Permanently |
| **Expectation** | A person's belief about another's future conduct, from history or custom | Nobody | — | Belief dynamics |
| **Recognition** | A recognition event under a relation law, witnessed, told or read | Held as belief by its audience | The recognising parties, by their own acts | In beliefs; disputable |
| **Custom or norm** | A norm record held by named people, transmitted culturally (§24.7) | Those who hold it, subjectively | — | Cultural transmission and loss |
| **Unilateral claim** | A claimant's declaration | Nobody until recognised | — | Until withdrawn or settled |
| **Imposed demand** | A demand backed by a credible threat | Nobody's assent; compliance is a choice under threat | — | While enforcement remains credible |
| **Office** | Recognition law (§35.2) | Holder and the recognising parties within scope | Holder plus the template's recognition threshold | Holder turnover through succession transitions |
| **Delegated authority** | A grant within an office or role scope, accepted by the delegate | The delegate within scope | Grantor's scope plus delegate's acceptance | Revocation, expiry or the grantor office's end |
| **Contested status** | Incompatible claims or recognitions held by different people | — | — | Until socially resolved |

An expectation is not an accepted obligation; an imposed demand is not volunteered service; a custom held by some is not universally recognised; creating a normative claim spends nobody's time and moves no property. Consequences flow only through belief, accepted authority, ordinary action or resolved force (§3.4).

#### 26.2 Relation laws

Each relation type with social meaning is declared by a relation law:

| Field | Meaning |
| --- | --- |
| Parties | Who may be party (adult, class, existing relation, role) |
| Origin | Which origin of §26.1 creates it and the required witnesses or contacted parties |
| Obligations | The obligation kinds it implies, with terms schedules |
| Review and renewal | Default periods and what a review compares |
| Exit and ending | Who may end it, how, and the consequences |
| Survivors | Responsibilities and claims that outlive it |
| Enforcement | None, reputation only, sanction by named parties, or force |
| Preference features | Typed consequence terms it contributes through registered adapters, such as household continuity inertia (§29.2); never a scoring path or a winning action |
| Inheritance and succession | Whether and how it transfers at death |

Baseline relation types: exchange, joint task, recurring work, patronage, household bond, care responsibility, parental recognition, mentorship, group membership, custodianship, office, delegation and pledge.

#### 26.3 Proposals and versions

A **proposal** names parties, the required assents, terms (obligations each way with quantities, quality, place, timing, division and scope), conditions, required reservations, revocability, expiry and enforcement basis. It has a semantic key and a **version number**. Any material change by the proposer creates a new version and supersedes the old one. A **counteroffer** is a new proposal with its own key that references its parent.

Proposals reach recipients only through co-presence or a messenger (§36.1). The proposer estimates likely responses from personal history and response priors; it cannot read any recipient's valuation, threshold or private commitments. Expired proposals hold nobody's time or goods.

#### 26.4 Responses, leases and commitment

- **Responses bind to versions.** Each recipient answers accept, refuse, counter or defer to a specific version, as an option in their ordinary deliberation. A response to a superseded version is void, and the voidness is communicated through the same channel.
- **Crossed counteroffers never combine.** Two outstanding proposals between the same parties are separate records. Compatible-looking terms never merge into a commitment; a commitment forms only when every required party has assented to the same version.
- **Provisional acceptance.** An acceptor may attach a provisional lease on their own backing and time, with expiry `P.social.leaseExpiry`. Leases commit existing goods and time once; nobody can reserve a party who has not consented.
- **Atomic local commit.** When all committing parties are co-present, the commit is one kernel transaction in phase 6 (§6.3): every required lease converts to a committed reservation, or nothing does.
- **Communicated distributed commit.** When parties are apart, the party who receives the last required assent while the version is current and its leases are valid sends a commit notice by messenger. Each party is bound from their own receipt of the notice (or from their own commit act); until then they hold only a provisional lease, which lapses at its expiry. A lost or late notice leaves the uninformed party unbound, and the others learn this only through observed non-performance or later messages.
- **Bargaining convention** (`P.social.bargaining`): the proposer opens at a fraction of its estimated ceiling; at most one counteroffer per proposal chain. There is no unbounded haggling loop.

#### 26.5 Group coordination through pledges

Group action uses **conditional pledges**: a pledge is an acceptance of a specific version conditioned on named partners, roles or supplies, with an expiry and a provisional lease of the pledger's own declared contribution. The coordinator learns pledges only as they arrive through real channels. A **mechanical validator** checks only the received pledges' declared, leased contributions against the plan's declared requirements; it never reads anyone's private stocks, schedules, preferences or alternatives. Pledges whose conditions remain unmet are removed in communication rounds, at most `P.social.pledgeRounds`, each round costing real message time. Only a stable set commits, by the distributed commit rule. Failure to stabilise postpones or aborts; silence supplies neither labour nor consent.

#### 26.6 Obligations

An obligation records debtor, beneficiary, kind, quantity or service, due window, scope, backing reference, completion evidence, basis (which origin created it) and survival rules. Kinds: deliver goods; perform labour; provide care; provide access to a site, store or route; obey orders within a declared scope; support or defend; remit a share; report; teach; repay a debt. New kinds are content when they reuse these operations, and new laws only when they create new causal consequences.

Obligations are indexed by due time in the due index. A due obligation appears on its debtor's agenda. Attention limits, memory eviction, task abandonment and holder turnover never delete one. Recurring terms default to `S.social.recurringPeriod` periods with explicit renewal; care and parental responsibility follow their own lifecycles.

#### 26.7 Performance, delivery and breach

Performance happens through ordinary tasks. Delivery releases matching backing, proportionately for partial delivery where the terms allow it. Breach is explicit (the debtor declares it, with ordinary consequences), observed (a due delivery does not arrive when and where the beneficiary can perceive it), or excused (the beneficiary observes a credible impossibility). Missed service records breach, known excuse and unmet need separately. Every observed breach raises h and lowers reliability in the observer's tie; excused failures do not. **Enforcement is never automatic.** Sanctions, exclusion and force are ordinary options for whoever can carry them out, paid in real time, goods and risk.

#### 26.8 Coercion and contingent value

A threat is a proposal whose stated refusal branch includes harm or lost access; an imposed demand is the same without a proposal's terms. Credibility is the recipient's estimate from the threatener's observed force, presence and past follow-through. Compliance can be the best option when alternatives are worse; it consumes real time and displaces rest, care, production and learning. Coercion never bypasses consent to a reproductive encounter and never creates ownership of a person. Until delivered, a promised good or service is contingent: forecasts discount it by the debtor's observed reliability, and it can never fund present consumption or serve as duplicated escrow.

#### 26.9 Norm and rule change

Rule sets and norms change only through declared cultural or institutional transitions. The baseline transition is unanimous re-acceptance by the current recognising parties; other transitions (majority, office decree, adjudication) are content plus a declared law, never a silent default.

### 27. Groups, roles, claims and shared assets \[III; V values\]

**A group is a set of people bound by accepted commitments, organised into roles, possibly holding shared assets, records and a rule set. It has no mind.** It acts only when its members, each deciding for themselves, perform their accepted roles. Every group is represented by an institution record (§34); this section states the group-specific rules.

#### 27.1 Formation and membership

Any adult may propose a group to a bounded number of known contacts (`P.social.contactsPerProposal`), naming roles, supplies, rendezvous, output division, rule set and withdrawal terms. Membership exists only through acceptance of an exact version. There is no charisma threshold, automatic formation or kin requirement; non-kin have the same options as kin. Individuals can always remain independent. Functional membership, household membership and political recognition can overlap without being identical.

#### 27.2 Roles are bundles of obligations

A role is a named bundle of obligation kinds (§26.6) with a scope, a standing envelope for its routine procedures (§34.5), and the procedures it carries. Assigning a role is a proposal; holding it is an accepted commitment; performing it is ordinary tasks. A role grants no ability, loyalty or obedience. A coordinator's assignments are proposals under the members' standing commitments, matched greedily with bounded repair, never by combinatorial coalition search.

#### 27.3 Rule sets

A group may adopt a versioned rule set (content) at formation: output division, admission, contribution levels, inheritance of shares, succession to roles, dispute procedures. Rule sets make social variation possible without changing any mind: two groups with different inheritance or succession rules produce different histories from the same people. Rules are applied by members who know and recognise them; contested application is a dispute, not a script. Rule change follows §26.9.

#### 27.4 Shared assets and claims

Shared stores hold physical goods with backed claim shares by person, household or group pool (§20). Depositing changes custody, not ownership. Withdrawal needs a valid claim and the custodian's actual execution, or an accepted rule or recognised authority scope. A **custodian** is a role, not an owner, and may hold separate personal shares. Allocating communal goods without an accepted rule or scope is an observable contested taking (§16.7). Claims are social facts (§25.4): effective only insofar as the custodian and others recognise them and nobody with greater force contests them. Theft, occupation and abandonment produce unbacked or disputed claims, never duplicated goods. Common assets survive any individual's task or tenure but still need custody, access and repair.

#### 27.5 Coalitions as an observational label

The analyst and observer may label a group a **coalition** after at least three independently consenting adults from at least two independent economic units (an unbonded adult counts as their own unit) have maintained an anchored arrangement with delivered duties for two completed recurring periods \[V\]. The label is measurement. It grants no bonus, property, obedience, mating eligibility or office, and it is not a prerequisite for cooperation or a historical stage.

#### 27.6 Scale expectations \[V, observational\]

Typical crews are small, with one to three levels of functional depth. Common coalitions may reach 10–70 members, successful ones 50–100, and rare integrated arrangements 120–150 when supplied and coordinated. These are expectations to measure against, never caps.

### 28. Exchange, cooperation and joint work \[II laws; V values\]

**Trade happens when two people value goods differently and agree to exact terms; cooperation pays when coupled roles produce more together than apart after the real cost of coordinating.** Neither is free, automatic or centrally optimised.

#### 28.1 Exchange

Exchange is a proposal under the exchange relation law: goods or services each way, quantities, delivery place, expiry and the leased payment.

- **Valuation.** Each party values goods by their own use (§14): the change in their best plan from having or losing them. A buyer's ceiling for an input is its incremental discounted material value to a known use, divided by quantity, and never more than accessible unreserved payment. When several inputs serve one project, committing one decrements the residual surplus envelope available for the rest.
- **Bargaining** follows the convention of §26.4. The supplier compares against their own feasible alternatives, including forgone rest, leisure and care.
- **Settlement.** Atomic transfer at co-location; partial delivery releases a proportional payment where agreed. Rejection leaves no imaginary goods. Distant trade requires production, transport, custody and risk; dispatched goods are not received wealth.
- **No market.** There is no global price, market clearing or standing bid for goods without a known use. Known prices are dated local evidence; prices emerge pairwise from valuations.

&#91;VII\] Two stone have an incremental net material value of 1.2 FU to a buyer with 3 FU free: ceiling 0.6 FU per stone, opening offer 0.3. A supplier whose delivery costs about 0.25 FU-equivalent may accept.

#### 28.2 Mutual insurance

An optional recurring commitment pools food toward a target of 2 quiet-food SD per covered member, with draws permitted toward 0.5 SD of unmet ordinary household coverage after personal supplies \[V\]. Contributions, eligibility and custody are agreed. Shortfalls are prorated by the agreed rules or explicitly breached. Pooling helps against independent risks and fails against correlated shortage. Its value is avoided loss only.

#### 28.3 Coupled work and contribution units

When a task's output depends on simultaneous complementary roles, let z₁, z₂ be actual simultaneous exclusive contributions **measured in the coupled task's contribution unit**: realised force (§37.2) for engagements such as hunts and combat; effective work rate (realised work-SD per SD after task expression, §24.4) for production such as workshops and construction. θ is the required share of that unit, n the number of direct participants and q coordination quality:

```latex
B=\min\!\big(z_1/\theta,\;z_2/(1-\theta)\big),\qquad \Phi=\eta\,[\,z_1+z_2+\gamma\,q\,B\,],\qquad \eta=\frac{1}{1+0.15(n-1)(1-q)}
```

Φ is in the same unit: effective force entering the engagement law, or effective work rate entering the recipe's work law. Units are never mixed.

| Coupled task | Unit | Roles (first-role θ) | γ |
| --- | --- | --- | --- |
| Hunt | Force | Pursuit and engagement vs containment (0.70) | 0.70 |
| Combat | Force | Contact vs flank, cover, reserve (0.75) | 0.45 |
| Workshop | Work rate | Fabrication vs preparation and handling (0.70) | 0.35 |
| Construction | Work rate | Assembly and lifting vs staging and holding (0.65) | 0.55 |
| Gathering, extraction | Output | Independent work | 0 |
| Guarding, pooled insurance | — | Benefit only through actual avoided loss | 0 |

B = 0 for a solo actor, a missing role or absent simultaneity. Complementarity applies once per physical worksite or encounter; parent groups never multiply a child group's enhanced output. Surplus is bounded by γqB and creates no extra raw material.

#### 28.4 Coordination costs \[V\]

A coordinator with n direct reports needs attention as a fraction of the operation's active interval:

```latex
u_{need}=\frac{0.025\,n^{1.3}\,\chi\,(1+z_{stale})}{A_{lead}\,c^{0.3}(1-w)^{0.4}(1-0.15d)},\qquad q=\min(1,\,u_{lead}/u_{need})
```

χ = 1 for one site, 1.5 for separate child groups; z\_stale = min(1, mean report age / 3 SD). An absent or incapable coordinator has q = 0. The least-supplied q along a command path applies. Organisation therefore sometimes creates surplus and sometimes destroys it, and broad personal command is expensive.

#### 28.5 Joint work and division

Several people may work the same recipe instance; their contributions are recorded and the output divided by the accepted terms. A joint hunt's carcass is divided as agreed and hauled by real people. A declined role reduces feasible output. Each participant's displaced rest, care and own production enter their own decision, never a group utility.

#### 28.6 Mentorship

Mentorship is a commitment or an unpaid service within a household or group: the mentor performs teaching work (0.15 work-SD per learner practice-SD at full teaching), the learner practises with the mentorship multiplier (§24.2) and may acquire methods (§24.7), and the terms state what flows back. Workshops are natural sites. Access to mentors is a channel of cultural inheritance (§32.1).

### 29. Households and care \[II meanings; V values\]

**A household bond is a recurring commitment to provision, care, residence and contact. It does not imply sexual exclusivity, reproduction, genetic fatherhood or ownership. Care of dependants is a responsibility with its own lifecycle that outlives any adult arrangement.** The cardinality, continuity and history rules below are declared baseline assumptions (§1.3), interpreted through the shared arbiter and envelopes, and must be reported as such.

#### 29.1 The primary provisioning bond (relation law)

- **Parties.** An F may hold one accepted primary provisioning bond at a time. An M has no fixed limit; each additional bond requires separately feasible liabilities and independent assent.
- **Content.** Agreed provisioning, care, residence and contact. Gifts, encounters and pregnancy never create a bond automatically.
- **Formation.** A mutual 3-SD recurring trial becomes a primary bond after delivered positive service on at least two different SD and renewed assent. No readiness or mating threshold is required. Trial parties remain independent economic units unless they explicitly pool.
- **Review.** At least every 3 SD and on material failure, through the common arbiter.
- **Establishment milestone \[V\].** After 6 SD of actual bond duration and two completed periods with at least 0.60 time-weighted fulfilment of due, nontrivial household obligations, with continued assent, the episode is recorded once as established. It grants nothing. Failed trials and unestablished episodes are recorded separately; genuine ending followed by reunion starts a new episode.

#### 29.2 Continuity and switching \[V\]

For an F's existing primary bond, continuity inertia (utility units) is a typed transition term contributed by the household relation law:

```latex
I_{bond}=4\big(1-e^{-T_b/12\,SD}\big)(0.4+0.6b)(1-h)^2\,q_{del}\Big[1+0.20\frac{N_{shared}}{N_{shared}+2}+0.15H_{shared}\Big]
```

T\_b is bond duration; b and h are her experience of the partner; q\_del is the last 3-SD fulfilment of household obligations; N\_shared counts recognised dependants with joint care commitments (never genetic children as such); H\_shared averages three indicators: shared base, intertwined backed goods or claims, shared actively used contacts. It is applied only at a proposed break, never as a recurring stay reward. Death, permanent loss of the household or failure of the severe-risk gate sets it to zero.

**Lifetime history friction.** For established-episode ordinal r ending, H\_PB increases by χ\_r \[r^1.5 − (r − 1)^1.5\], with χ = 1 for voluntary endings, 0.35 for partner death and 0.50 for evidenced forced separation, severe abandonment or escape from sustained harm; unknown reasons default to 1 until a once-only correction. Forming a new F primary bond carries a one-off cost C\_history = 0.80 H\_PB, including the anticipated increment if it replaces a current established bond, charged once in the formation plan.

**The transition comparison.** With ΔV₀ the ordinary net advantage already including real switching consequences and excluding these two frictions, a voluntary F primary-household transition requires

```latex
\Delta V_0 - C_{history} > \max(0.05,\; I_{exit})
```

where I\_exit is the inertia of the bond being broken. This replaces the ordinary incumbent margin for this transition. Leaving without forming another bond pays no history cost. For Ms, exit inertia is 0.35 × I and there is no history surcharge; adding an affordable additional M bond breaks nothing.

#### 29.3 Provisioning arithmetic \[V\]

Default child responsibility is 60% maternal side and 40% recognised supporting side until a different arrangement is accepted. With C the child food requirement, R\_F her requirement, Y\_F her net contribution and X\_F support assigned to her side, the partner requirement is Q\_MF = \[R\_F + 0.6C − Y\_F − X\_F\]₊ + 0.4C. Without a supporting side, the 40% remains uncovered need that available caregivers must face; it is never deleted. Caregivers choose child feeding tiers {1, 1.15, 1.30, 1.50} × estimated ordinary requirement from observed growth and means; they cannot read the hidden developmental target. A child's real contribution is recorded once, with gross need and net household liability both visible.

#### 29.4 Optional support and courtship spending \[V\]

Optional support uses the same authorization ledger as all discretionary spending (§16.3). An M's cumulative optional support per 3-SD epoch is capped at min(accessible unreserved surplus, 3 B̂\_quiet); an offer to a particular recipient is capped by the remaining allowance and 3 B̂\_quiet (0.10 + 0.90 A²), where A is his attraction to her. The number of recipient households considered is bounded by the review's effort account and `P.attn.offers`. Obligations come first; refused offers release only undelivered resources; renamed offers, interruptions and household changes cannot renew the allowance. Communal goods are not personal gifts without an authorised scope or a contested taking.

#### 29.5 Care responsibility (relation law)

- **Creation:** maternal responsibility at birth; prenatal or later acceptance by a recognised father or other adult (§31.4); accepted substitution or guardianship.
- **Content:** the required care curve and food for the dependant (§23.3), delivered co-located; time divides among children; care coverage is 1 when required care is zero.
- **Survival:** continues through adult separation until maturity, death, accepted reassignment, or explicit abandonment with its observed consequences. It is never deleted by an attention limit, an agreement's expiry or a task's abandonment.
- **Unmet need** remains unmet; it is never silently reassigned or forgiven. After a carer's death, urgent care requires reachable willing carers who perceive or are told of the need; shortages harm development and survival.

#### 29.6 What a household is not

A household is not a market trade, ownership of a partner, a guarantee of mating, or a statement about paternity. Bonds are non-exclusive in the baseline. Mate guarding, fidelity-conditioned support, jealousy and punishment of extra-pair behaviour are absent; studying them requires a declared new relation law (§41).

### 30. Attraction, readiness and mating \[II structure; V values\]

**Attraction is a person's evaluation of observed traits and observed success; readiness is a slowly built, pair-specific willingness; an encounter happens only when both choose it.** Power and success matter only through what others observe and the contact and support they make possible.

#### 30.1 Observable traits

Visible display S = U\_v (0.70 + 0.30 D\_phys); visible health H = clip\[c(1 − 0.5w), 0, 1.2\]. Others perceive noisy dated observations of S, H and the display marker θ, never genotype or development.

#### 30.2 Attraction \[V; declared asymmetry\]

```latex
A_{F\to M}=\sigma\Big\{4\big[\log\hat S_M+0.30\cos(\psi_F-\hat\theta_M)+0.15\,\mathrm{clip}\big(\tfrac{\hat H_M-1}{0.20},-1,1\big)+0.50\,\pi_{FM}\big]\Big\}
```

```latex
A_{M\to F}=\sigma\Big\{4\big[1.40\log\hat S_F+0.25\cos(\psi_M-\hat\theta_F)+0.10\,\mathrm{clip}\big(\tfrac{\hat H_F-1}{0.20},-1,1\big)\big]\Big\}
```

Compatibility (the cosine terms) can reverse rankings. Neither function reads q, hidden fertility or any rank. Clothing and equipment carry no default beauty coefficient.

#### 30.3 Observed success π

π ∈ \[0, 1\] is one observer's evidence of another's consequential success, decaying with τ = 24 SD. For one witnessed or credibly reported event:

```latex
\pi'=1-(1-\pi)\,e^{-v_{event}/4},\qquad v_{event}=\mathrm{clip}\Big(\frac{\widehat{\text{net consequential value}}}{4\,\hat B^{quiet}_{observer}\,SD},\,0,\,1\Big)
```

**Success-credit eligibility \[V; declared assumption\]:** completed consequential hunts, defence, contested access or control outcomes, and exceptional communal relief. Routine production, craft, discovery, teaching and administration update b, not π. Credit is split among visibly responsible contributors, summing to at most one; a title or command position does not automatically receive it. Duplicate reports earn nothing extra. Mating success creates no π. Changing the eligible set is a named experiment.

&#91;VII\] With other inputs centred, π = 0 gives A = 0.5; one maximal event gives π ≈ 0.22 and A ≈ 0.61; sustained π = 1 gives A ≈ 0.88.

#### 30.4 Hidden close-kin suppression

When an adult reproductive pair first becomes relevant, the biology law classifies their closest genetic relationship from the pedigree, searching shared ancestry to depth three per person and direct ancestry to depth six, and caches it sparsely for the pair:

| Class | Canonical path rule | g |
| --- | --- | --- |
| Very close | Direct ancestry ≤ 3 edges; parent–child; full or half siblings; grandparent; avuncular; any common-ancestor path pair with sum ≤ 3; or two independent first-cousin ancestral couples | 0.075 |
| First-cousin band | Common-ancestor path pairs (2, 2), (1, 3) or (2, 3); or direct ancestry of 4 edges | 0.25 |
| Second-cousin band | Any remaining shared ancestor within 3 edges of each; or direct ancestry of 5–6 edges | 0.50 |
| Outside | None of the above | 1 |

Where paths overlap, the most suppressive class applies. Founders are declared unrelated. A persistent pair uniform U\_pair is derived once from (seed, unordered pair keys, kin domain); the pair may reproduce only if U\_pair < g^κ (κ = 1). The gate is applied once at encounter acceptance, hidden from planning; refusal discloses nothing. It is never redrawn by new proposals, initiator changes, time, forgetting or reload, and is not multiplied into attraction, readiness, conception or sire selection. People know only socially observed kinship.

#### 30.5 Readiness (F toward a specific M)

```latex
\dot r=\lambda(1-r)-\mu r,\qquad \lambda=(1-h)\big[k_A A^4 e + k_B\, b\, s\,(1+0.5z)\big]
```

k\_A = 6/SD, k\_B = 0.18/SD, μ = 0.05/SD. e is meaningful co-present exposure (1 during attended direct contact, 0.2 during compatible nearby co-work, else 0; overlapping labels take the maximum). s = max(0, 1 − (t − last positive service)/4 SD). z = clip((c\_F − 1)/0.20, 0, 1) times his share of her useful nutrition over the last 3 SD (zero if enhancement is disabled). During pregnancy, hard recovery or other ineligibility λ = 0. Readiness is an anchored law: r(t + Δ) = r∞ + (r − r∞)e^(−(λ+μ)Δ) with r∞ = λ/(λ + μ), handling λ = 0 without division. Thresholds: acceptance 0.65; F initiation 0.85; crossings are scheduled analytically and edge-triggered (§9.5), and open consideration rather than causing an encounter. Hidden biological transitions never announce themselves through threshold notifications. After a completed encounter only that pair's r ← 0.05r.

#### 30.6 Satiation and cooldown

- **Encounter satiation** S^R = Σ exp(−age/τ\_R) over completed encounters; the encounter-value multiplier is m\_R = 1 / (1 + κ\_R S^R), with (τ\_R, κ\_R) = (2 SD, 0.50) for F and (0.75 SD, 0.20) for M. It affects encounter value only (§12.5), applied once using the pre-encounter value.
- **Pair cooldown.** The same pair cannot start another encounter within 0.75 SD of a completed one; last-completion times survive tie eviction. There is no global or M-wide limit.

#### 30.7 Acceptance

An encounter requires both adults to choose it through their own arbitration, be alive, adult and co-located within 0.01 km, and to have reserved 0.03 SD free of conflicts. The F must be biologically eligible at execution, checked by the world, not her planner. She evaluates the possible pregnancy with her own forecast. Ready, willing pairs need no payment.

For an optional offered transfer q FU, with Q\_F = 3 SD of her ordinary household food need and ν = clip(1 − reliable coverage + 0.10, 0, 1):

```latex
W = r + 0.20\,\frac{\nu q}{q+Q_F} - K_{disrupt},\qquad r\ge 0.35,\quad W\ge T
```

T ≥ 0.65, rising toward the best of up to three known reachable alternatives on the same scale; waiting assumes no unseen perfect partner. K\_disrupt = clip\[0.20 × expected material household loss / Q\_F, 0, 0.20\] contains real expected loss only, never jealousy. Ms cannot read her threshold and can only try bounded actual offers. Escrow transfers once on completion; an aborted encounter releases unused backing. The kin gate applies afterwards without a new draw.

**Novel-partner cost.** Each F keeps the exact sparse set of Ms with whom she has completed an encounter. With n the number of **prior** distinct completed partners, a first encounter with a new M costs K\_Novel(n) = 1.25 n² / (9 + n²) utility once, in her forecast at expected first completion: 0, 0.125, 0.385, 0.625, 0.800, 0.919 for n = 0 … 5. Repeat encounters with the same M cost nothing; an aborted encounter adds no count. It is not applied again to W, attraction, readiness or conception. No analogous cost applies to Ms in the baseline.

**Consent is absolute.** Threats, conquest, dependency, debt and poverty change alternatives; they never bypass acceptance. There are no assigned partners, coerced encounters or victory-awarded mates.

#### 30.8 Exactly-once effects and snapshots

Completion updates the pair's readiness, cooldown and both parties' satiation once, and creates one short-lived private biological encounter record with the real completion time, the M's age and condition snapshot, and an **encounter-time primary-bond snapshot** for each party. Proposals, animations, accepted appointments and aborted actions create no such record.

### 31. Conception, pregnancy, birth and parenthood \[II structure; V values\]

**Conception is a hidden biological event drawn at most once per eligible F per SD from her actual recent encounters; recognition of fatherhood is a separate social event. Genetic sire, recognised father, accepted caregivers and care actually delivered are four different records.**

#### 31.1 The hidden fertility opportunity

Each F has a fixed private phase U\_F ∈ (0, 1), an integer quantum in 1 … 2²⁰ − 1 divided by 2²⁰, keyed once. Her opportunity in SD d occurs at t\* = d + U\_F, exactly once per SD whether or not she is eligible (one opportunity per SD is a mechanism rule, class C). At t\* she must be living, adult, not pregnant and outside hard post-birth recovery.

- **Candidates** are her actually completed, biologically eligible encounters in \[t\* − 1 SD, t\*\] not consumed by an earlier opportunity, including completions at exactly t\*. All qualifying records are consumed at evaluation, success or not; an ineligible opportunity discards records reaching it.
- **Sire selection.** Each represented M has weight w\_M = max over his records of exp\[−(t\* − t\_e)/0.5 SD\]; one candidate is chosen with probability proportional to weight. Rank, π, readiness, attraction, bond status and previous offspring add no weight.
- **One conception draw:**

```latex
p_c = 0.25\,\min(1,c_F(t^*))\,\min(1,c_M(t_e))\,\phi_F(a_F(t^*))\,\phi_M(a_M(t_e))\,g_{post}(t^*)
```

The M's condition and age come from the selected encounter's snapshot. p\_c is never multiplied by encounter count, window width or candidate count; three candidates share one opportunity. A failed draw has no reroll that SD. A previously eligible M who dies before t\* can still be the sire through his retained record.

| Age (years) | F fertility φ\_F | Age (years) | M fertility φ\_M |
| --- | --- | --- | --- |
| < 18 | 0 | < 18 | 0 |
| 18 | 0.90 | 18 | 0.90 |
| 20–30 | 1 | 20–40 | 1 |
| 40 | 0.55 | 60 | 0.65 |
| 45 | 0.15 | 80 | 0.20 |
| ≥ 50 | 0 | ≥ 90 | 0 |

Curves are piecewise linear between listed points. Nutrition, beauty, success and office add no fertility multiplier.

#### 31.2 Pregnancy, loss and birth

On conception, at t\* and never backdated, the biology law privately records the true sire, mother, conception time, gestation drawn uniformly in \[8.5, 9.5\] SD, a recognition delay drawn uniformly in \[1.5, 2.5\] SD, and a **conception-time primary-bond snapshot**. Pregnancy adds 0.20 to the requirement multiplier (§22.1) and opens the pregnancy's loss-hazard episode (§22.4). Future encounters that are now biologically impossible are invalidated truth-side: their paid prefixes settle and only unused backing is released, **without any notification to either mind** (§7.5). The counterparty discovers unavailability only as experienced unavailability when attempting. No recognised father, heir or paternal obligation arises at conception.

**Pregnancy loss** ends the pregnancy and any prospective records, begins 0.5 SD of recovery, creates no child, estate or new opportunity, does not reset the last-birth clock, and is not a cause of maternal death. Maternal death ends the pregnancy. A surviving due pregnancy produces exactly one child (§23.5). Death or loss at the birth timestamp precedes birth.

**Post-birth return.** Hard recovery lasts 3 SD (no readiness gain, no encounters, +0.15 requirement). Afterwards encounters resume fully; only conception probability returns gradually:

```latex
g_{post}(\Delta)=\begin{cases}0,&\Delta\le3\ \text{SD}\\ 1-e^{-(\Delta-3)/3},&\Delta>3\ \text{SD}\end{cases}
```

Before any birth g\_post = 1. A return τ of zero gives immediate return after the hard boundary without division by zero. No other term receives this multiplier.

#### 31.3 What minds know about reproduction

- Nobody perceives t\*, the candidate list, the selection, the draw or an unrecognised pregnancy.
- After the recognition delay, the F becomes aware through self-observation; others learn through contact, reports or visible later pregnancy, as an uncertain stage and expected birth range, never the exact timer.
- Planning may use a coarse contact-dependent probability of conception, capped at 0.25 per eligible SD, integrated over unknown timing; it cannot aim at the hidden phase or count several lotteries for one SD.
- **Unconceived children carry zero dependant value** (§12.5). A recognised pregnancy carries expected dependant value only from its expected live birth, weighted by estimated survival, for a person with maternal or accepted prenatal responsibility. At birth the prospective key maps once to the actual child, never counted twice. An unobserved loss cannot remove a forecast before evidence.

#### 31.4 Recognition is a social event (relation law)

After awareness, the F may propose prenatal responsibility to her primary partner or any reachable willing adult. Acceptance at a communicated meeting creates a **prenatal responsibility record**; at birth it becomes recognised fatherhood and a care responsibility, and the **recognised father at birth** is snapshotted; if the pregnancy is lost it closes. Without prenatal acceptance, recognition can arise at birth, by later explicit acceptance, or by an observed household-continuation meeting. The primary partner is the common first candidate, never an automatic answer. A documented renegotiation, adoption or disavowal changes future recognition; past care and transfers remain historical fact. The baseline permits one active recognised father (class C) and any number of accepted caregivers. Disputed fatherhood is a contested status until socially settled; a new adult partner does not silently replace a previous accepted parent.

#### 31.5 Four records, kept apart

| Record | Created by | Read by |
| --- | --- | --- |
| Genetic mother and sire | Biology at conception | Genetics at birth; analyst; never inheritance or recognition |
| Recognised father | Recognition event | Inheritance; care obligations; social knowledge |
| Accepted caregivers | Care responsibility acceptance | Care delivery; development inputs |
| Care delivered | Actual paid co-located care | Development (§23.3); ties |

A genetic sire receives no automatic support obligation. Witnessing an encounter conveys the act, not its result; inference from sparse social evidence is ordinary reasoning, while reading hidden state is a leak. Recognised fathers may know of extra-pair mating and continue caring; non-paternity knowledge in an explicit experiment never rewrites the past. Measurement snapshots (encounter-time bond, conception-time bond, recognised father at birth) are immutable and are what metrics read (§38.4).

### 32. Childhood, death, estates and the three inheritance channels \[II channels; V rules\]

**Advantage passes between generations through three separate channels: genes from true parents, property through socially recognised heirs, and culture and opportunity through care, teaching, access and example. They share event machinery but never their meaning.**

#### 32.1 The three channels

| Channel | What passes | Through what | Reads |
| --- | --- | --- | --- |
| Genetic | Alleles and markers | Birth (§23.1) | True parents only |
| Material | Personal property and claims, net of liabilities | Estate settlement under the applicable rule | Recognised parenthood and household records only, never the hidden sire |
| Cultural and opportunity | Nutrition, care, safety, mentoring, methods and norms known, equipment access, ties, location, institutional roles reachable | Ordinary care, teaching, residence and recruitment | Actual deliveries, teaching and co-presence |

No channel substitutes for another: a rich heir does not inherit skill or methods; a gifted child does not inherit tools; a mentor's skill does not pass into genes; an office does not descend as property.

#### 32.2 Childhood

Children live their own finite ledger of care received, play, rest, supervised practice and age-permitted work (§23–§24). They acquire methods by observation and teaching like anyone else. Their output is a recorded contribution under an explicit household arrangement. A minor heir owns their inherited share while an accepted adult holds custody; guardianship never converts that share to the guardian's property. Children move only by being carried, escorted or walking.

#### 32.3 Death

At death the lifecycle law ends activity and pregnancy, ends the person's own future reservations truth-side, leaves goods physically where they are, records the death and its cause, and opens three processes:

1. **Care continuity.** Dependants' responsibilities need reachable willing carers who perceive or learn of the need; others decide whether to take them on; shortages harm development and survival.
2. **Estate settlement** (§32.4).
3. **Succession** for any office or role the person held (§35.4).

Counterparties, creditors, subordinates and kin learn of the death only through perception or messages (§7.5). The person's pedigree, true parenthood, recognitions, care history and estate events persist in the archive permanently.

#### 32.4 The baseline inheritance rule \[V; rule-set content\]

1. **Liabilities first.** Existing debts, due obligations with backing and reserved backing are settled from the estate or explicitly carried as estate claims before any free distribution. Disputed claims are recorded as disputes, not paid as if resolved. Goods already transferred are never reclaimed; the estate cannot distribute a store merely because the deceased was its custodian.
2. **Only free personal estate is distributed:** personal goods, items and claim shares in others' stores, net of step 1. Communal workshops, institutional stores, outposts, command and office rights do not descend because the deceased controlled them.
3. **Heirs** are living socially recognised children, equally for divisible goods and by semantic-key round-robin for items, with no invented compensation. A pending accepted prenatal claim reserves a provisional share, resolved once at birth or loss.
4. **With no recognised children:** surviving accepted primary-household beneficiaries; otherwise goods become physically unclaimed.
5. Adult partners are never inherited. Inheritance changes claims, not location: unreachable goods remain unreachable despite a valid claim. Appropriation by others is an observable transfer or dispute, not an ownership rewrite.

Many heirs fragment material advantage. Together with genetic segregation, unequal care, lost mentors, lost methods and contested succession, this lets exceptional lineages rise and fall without any anti-success rule.

#### 32.5 Changing the rule

A world, group or experiment may adopt a different inheritance rule (primogeniture, household pooling, matrilineal descent, communal reversion) as rule-set content. The mind, the ledger and the estate process are unchanged; only the rule the settlement reads differs (§41.3).

## Part VII — Power and institutions

### 33. Dependency, patronage and coercion \[II meanings; V values\]

**Power is the ability to change other people's alternatives. It comes from resources, dependency, accepted commitments, recognised claims, coercive capacity, information, organisation and logistics. It never comes from a title or rank as such.**

#### 33.1 Outside options are concrete

Every decision to accept, continue or leave an arrangement compares it with alternatives the person actually knows and can reach: independent subsistence, another patron or household, migration, refusal, resistance. Leaving includes real travel, lost services and continuing responsibilities; staying includes real burdens and failures. A distant, unknown or infeasible alternative counts for nothing. A poor outside option is not absence of agency.

#### 33.2 Patronage (relation law)

A patron offers recurring support (food, access, protection, equipment, mentoring) in return for recurring service (labour blocks, goods, support in disputes or fights). Both parties periodically compare continuation with exit. Dependency deepens only when the client's real alternatives worsen; it is not a stored loyalty value.

#### 33.3 Extraction and allocation

A controller (patron, custodian with scope, office holder) may request labour blocks or remittance goods.

- **Labour** occupies the subordinate's ledger and displaces their rest, enjoyment, care, own production and learning; all enter the subordinate's own decision.
- **Remittance** consumes surplus or requires extra production and hauling.
- **Terms** (`P.social.extractionMenu`): the controller offers coverage from a small menu of multiples of the requested need, with at most one interpolation. It estimates acceptance from observed outside options and past delivery and refusal; it never reads the worker's valuation, dispositions or alternatives.
- **Allocation** among urgent needs, commitments, specialists, apprentices, developmental feeding, repairs, guards, equipment, objectives and own enhancement uses the same deliberation. Enhanced-condition feeding uses targets 1 + ε{0, 0.25, 0.5, 0.75, 0.95} at their real food cost; a powerful person's larger meals need a forecast purpose, never a ruler bonus. Every allocation is an actual transfer with its claim or scope basis.

Neither fairness nor exploitation is hard-coded. Patient controllers may preserve output and support; impatient ones can over-extract and lose workers, production or control.

#### 33.4 Coercion and contested appropriation

Threats and imposed demands (§26.8) change alternatives only when the threatener can actually enforce them: observed credible guards, routes, presence or resources. Enforcing a threat is a costly task with real risk; pursuing people who leave is a fresh costly objective; unenforced threats are learned to be empty. Seizing goods without consent is a contested taking (§16.7, §20.7): physically possible where access exists, never consensual, leaving disputed claims and evidence behind.

#### 33.5 Refusal, exit and resistance

People may refuse, exit, migrate, breach, resist or defect. Standing assent authorises only routine tasks within scope (§16.5); changed terms, out-of-scope orders and personal danger return to the person's own deliberation. A subordinate who keeps stores, crews and local production while stopping upward deliveries becomes practically independent before any formal secession; the centre learns only through missed remittances or reports and must bargain, concede or fund a response.

#### 33.6 What is absent

There is no tyranny score, loyalty statistic, legitimacy meter, rank bonus, automatic obedience or ownership of persons. Delivered agreements, observed reliability, recognitions held by particular people and actual force are the only record of a power relationship.

### 34. Institutions as persistent social artefacts \[III; V content\]

**An institution is a world-owned social artefact: durable records of identity, rules, roles, delegations, assets, liabilities, standing plans, procedures, pending cases, record custody and succession, maintained by the social protocol under institution laws. It is not a mind, not a globally readable memory and not automatic compliance.** People must still learn of its records, access them, understand them, accept or hold roles, execute procedures, and comply, refuse or breach. Scaling comes from division of work, local records and delegated authority, with real delay and attention costs.

#### 34.1 What an institution is and is not

Groups, offices, guilds, councils, temples, chiefdoms and states are all institutions: compositions of people, roles, standing commitments, rule sets, shared assets, recognitions held in people's beliefs, enforcement practices and communication channels, given continuity by an institution record. There is no institution AI, household AI, office AI, army AI or state AI. Institutions act only through members' accepted tasks.

#### 34.2 The institution record

| Field | Content |
| --- | --- |
| Identity and continuity | Semantic key, founding event, template, dissolution state |
| Rules | Versioned rule set with adoption and amendment provenance and the parties who recognised each version |
| Roles | Role definitions (obligation bundles, scopes, standing envelopes, procedures) and current holders with their acceptance events |
| Delegations | Grants: grantor role, grantee, scope, envelope, expiry and revocation conditions |
| Assets | References to containers, structures and claims held by the institution as claimant |
| Liabilities | Obligations and debts owed by the institution |
| Standing plans | Project records sponsored by the institution (§15.10), with the roles entitled to amend, renew or abandon them |
| Procedures | Adopted procedure versions (§34.5) |
| Pending cases and orders | Due records: expected remittances, issued orders awaiting execution, open disputes, pending appointments |
| Record custody and access | Which records exist where: oral records carried by named people, located written records (when that law exists); access rules by role |
| Channels | Designated messengers, meeting places and schedules |
| Appointment and succession | The succession rule and any pending transition |

The record is truth-side and authoritative. It is analyst-visible. Minds see only their **institutional projection**: the parts they witnessed, were told, read or received at handover, each dated (§11.3).

#### 34.3 Knowledge and access

An institution's records confer no knowledge by existing. A person knows an institutional fact only by witnessing it, being told it, reading an accessible record, or receiving it at a handover meeting. Different members may hold different and outdated projections. Institutional obligations, assets and pending cases persist truth-side even when nobody currently knows them; their consequences surface as observed deliveries, non-deliveries, visits and disputes.

#### 34.4 Oral and written records

In the baseline, institutional memory is oral: a role holder carries institutional belief records (pinned while the role is held) acquired through participation, reports and handover. Handover is an Attend operation whose duration grows with the records transferred (`S.inst.handoverRate`); what is not handed over is not known to the successor. Records can be lost when their carriers die or leave, stale when unrefreshed, and contested when carriers disagree. **Writing** is a later law: written records become located information artefacts with authorship, provenance, a reading requirement, capacity, access and copying costs. It changes how institutional information travels and persists, not how minds use it.

#### 34.5 Procedures

A procedure is a bounded declarative method in the content algebra (§4.5) with role-scoped parameters and due-record triggers: inspect a due record, travel to a place, receive and deposit goods, send a request, allocate within scope, report an exception. A role holder who has accepted the role and knows a procedure and the relevant due record may have their runtime execute its routine steps under the role's standing envelope (§16.5). Exceptions (a non-delivery, a refusal, a change of terms, a new trade-off, danger) escalate to the holder's mind. Procedures cannot contain strategic code, scoring, priority scripts or world queries, and cannot wake any institutional optimiser.

#### 34.6 Continuity through holder turnover

When a holder dies, disappears or leaves, the institution's identity, rules, assets, liabilities, standing plans, procedures and pending cases remain as records; located assets remain where they are. Distant members learn of the change only through channels. Local interim choices about custody, care and command are made by people who perceive the change. A successor acquires the office through the succession transition (§35.4) and acquires knowledge only through handover, records, reports and their own observation; they never inherit the predecessor's private beliefs. Surviving duties continue to bind the institution; who performs them depends on who knows and accepts them.

#### 34.7 Liabilities, amendment and dissolution

Institutional liabilities are settled from institutional assets by the roles whose scope covers them, or remain recorded as unpaid. Amendment of rules, plans and procedures follows the rule set's declared transition (§26.9). Dissolution is a recorded transition that distributes or abandons assets per the rules and leaves unpaid liabilities recorded; it is never an automatic consequence of membership falling.

#### 34.8 State machines that remain genuinely necessary

Some processes have causal structure no generic lifecycle captures. They are explicit laws over shared records, each a state machine, none a planner:

| Law | States and transitions | Section |
| --- | --- | --- |
| Pregnancy and birth | Hidden opportunity → conception → awareness → birth or loss → recovery | §31 |
| Recognition of parenthood | Proposed → accepted prenatal → recognised at birth → renegotiated, adopted or disavowed | §31.4 |
| Care responsibility | Created → active → reassigned or abandoned → ended at maturity or death | §29.5 |
| Household bond | Trial → primary → established → ended (with reason) | §29.1 |
| Agreement | Proposed (versions) → leased → committed → performed, breached or excused → renewed or ended | §26.3–§26.7 |
| Office | Eligible → proposed → recognised → active → vacant → succeeded or contested | §35 |
| Delegation | Granted → accepted → active → revoked or expired | §35.3 |
| Institution | Founded → active → amended → dissolved | §34 |
| Collective objective | Proposed → pledged → assembled → engaged → settled | §37.1 |
| Occupation | Present → holding → completed, frozen or eroded | §37.3 |
| Estate | Death → liabilities settled or carried → distribution under the applicable rule → closed | §32.4 |
| Coalition label | Arrangement → maintained → labelled (observation only) | §27.5 |

A new institution type normally reuses these. A genuinely new state machine (an ordination, a court's verdict) requires a relation or institution law and the extension protocol (§41), not a new decision system.

#### 34.9 Formal and effective, everywhere

Every institutional record separates what is recognised (scope, membership, claims, office) from what actually happens (who delivers, who obeys, who holds force, who knows). Observer and analyst views display both. Measurement never treats a title as evidence of control (§38).

#### 34.10 The continuous path

| Progression | General machinery used | New typed law or state needed |
| --- | --- | --- |
| Gather → inquire → trial a material → learn → make a tool | Evidence, trial grammar, repertoire, projects, runtime, capital ledger | Material effects (founding) |
| Trade → cooperate → recurring division of labour | Versioned proposals, independent response, leases, pledges, coupled work | Exchange and joint-task relation laws |
| Household → care for children → patronage | Care responsibility, delivered service, outside options | Household, care, recognition and patronage laws |
| Work group → delegation → office | Roles, standing envelopes, procedures, recognition audiences | Office and delegation laws |
| Remittance → raid → army supply → territory | Due records, logistics as hauling and storage, collective objectives | Contest, occupation and influence laws |
| Remote administration → succession → fragmentation | Institution records, channels, handover, practical independence | Succession transitions; later writing |
| Intergenerational technologies and institutions | Teaching, demonstration, records, lost and rediscovered methods | None beyond the above |

No row needs a new mind. Some need narrow new laws and state; those are legitimate additions.

### 35. Authority, office, delegation and succession \[II meanings; V values\]

**Formal authority is a recognised social fact; effective power is who can actually make things happen. They usually travel together and can come apart: a chief can become a figurehead while a captain controls force and a steward controls supplies.** Office is not ownership, and succession is not inheritance.

#### 35.1 De facto authority

Recurring coordination, custody, protection, access enforcement and remittance create authority without any office. Its only record is delivered agreements, actual support, recognitions held by particular people and observed reliability. Store ownership, shared allocation and command remain distinct.

#### 35.2 Standing office (one baseline template) \[V thresholds\]

The baseline supplies one office template; it is content, not the universal origin of states, and other templates are permitted extensions.

- **Eligibility.** An adult with real recurring responsibility at a shared anchor may propose a standing office after at least 12 SD of fulfilled authority across at least three completed recurring periods, with at least three independent adult counterparties from at least two economic units. Duration is elapsed history; issuing empty orders does not count.
- **Recognition.** The proposer contacts directly affected known parties (bounded by `P.social.contactsPerProposal`) through paid meetings or messages, specifying exact anchors, rights, contribution terms and recall or renewal conditions. Recognition requires at least three independent acceptances covering at least 60% of the contacted parties' recent delivered volume. Uncontacted people and third-party property are outside the grant; nobody can give away another person's claim.
- **The office record** is an institution role record (§34.2): holder or claimant, parent office, recognition event and its audience, a bounded set of anchors, backing commitments, scoped rights (allocate communal resources or access, appoint custodians and subordinate holders, request service, receive agreed contributions, nominate a successor), standing envelope and procedures, successor nomination. Office graphs are acyclic and separate from functional group graphs.

Recognition creates **no force, food, attraction or obedience**. It creates recognised rights within a scope, held as recognitions in the beliefs of its audience (§25.4).

#### 35.3 Orders, appointments and delegation

An order is a communicated request under members' standing commitments. Routine orders within scope may execute under the recipient's standing envelope after they receive and validate it; the recipient's mind still weighs anything outside routine against their alternatives, including the cost of breaching and any credible sanction. Effective custodians and crews decide whether to execute.

A **delegation** grants a scoped envelope from an office to an accepting delegate, recorded in the institution record with expiry and revocation conditions. A delegate can do only what the grantor's scope permits; an office cannot grant more than its recognising parties granted it. Appointment requires an authorised scope and a willing candidate. Granting a talented subordinate followers and equipment can strengthen defence and can make a coup feasible; no loyalty or betrayal trait is needed.

Political work (processing, allocation, appointment, negotiation, remittance handling, handover) is real work with the administration task expression (§24.3); it teaches Organise and Social. Passive tenure teaches nothing. Holders consider a bounded number of observed or reported candidates for appointments through ordinary deliberation.

#### 35.4 Succession

A holder's death or incapacity opens a vacancy truth-side immediately; local interim choices about care, custody and command are made by those who perceive it, and distant parties learn by message (§7.5). Succession proceeds by nomination, accepted handover, recognition by the affected parties, or contest (§37). There is no compulsory vacancy timer and no automatic hereditary transfer. A rule set may specify a succession rule; members apply it insofar as they know and recognise it. The successor receives the office's scope and its institutional records only through the transition and handover (§34.6), not the predecessor's private knowledge. Physical control, remittance failure and formal succession dates are recorded separately. Material inheritance and political succession can select different people and transfer different objects.

#### 35.5 Sex and coercive office \[V\]

Formal sex restriction on office is **off** by default. The intended M-centred coercive regime must arise from material mechanisms (task expression, combat, recruitment). If it repeatedly fails, investigate command expression and recruitment first (§46). Only then may an explicitly versioned experiment restrict narrow coercive-command grants to M holders; its results must never be described as wholly emergent. F property, custody, allocation, skill, care, administration and informal influence remain eligible in every variant.

### 36. Communication, administration and territory \[II meanings; V values\]

**Information travels only with people and, later, with located records. Administration is people executing institutional procedures across distance under real delay and processing cost. Territory is a network of supplied presence, guarded access and routes, not coloured cells.**

#### 36.1 Communication

- **Channels.** Speech requires co-presence. Anything further travels with a messenger: a person who accepts a delivery commitment, carries the message as a dated report and delivers it at a meeting. Audible warnings reach 0.15 km. Later channels (writing, signals) are channel laws.
- **Messages** carry sender, intended recipients, original provenance, content, time, channel, urgency and expiry. A report about a distant store is not a subscription to that store.
- **Costs.** Composing, relaying, reading and acting on messages consume real social and administrative time; administrative backlogs remain visible.
- **Fidelity.** Reports keep original provenance and age; recipients weigh them by source reliability (§11.4). Messages can arrive late, never arrive, or be outdated on arrival. Public recognition has an audience; the whole world does not automatically know it.

#### 36.2 Administration

Administration is institutional work: receiving reports, keeping due records, allocating, appointing, requesting service and collecting remittances, mostly through procedures (§34.5).

- **Delegation.** A higher office reaches distant people only through subordinate offices, delegates or messengers. Each relay adds delay, cost, discretion and distortion.
- **Processing limits.** Each report and decision takes the holder's time under the administration task expression (§24.3) and their effort account. Coordination attention grows with direct reports (§28.4). An overloaded office degrades through delay and missed obligations, not through a penalty.
- **Due records.** Expected remittances and duties are indexed by due time. Assessed dues, promised deliveries, reserved goods, dispatched shipments, received goods and usable resources are distinct; a remote treasury is a set of claims and uncertain reports until goods can be accessed. A missed remittance is learned only when expected and not received, or when reported.

#### 36.3 Territory

Territory is the network of staffed assets, stores, outposts, resource access, routes, crossings and associated households a group can actually protect and supply.

- **Effective control** requires reachable interception or defence: credible responders who can arrive in time with supplies. Empty outposts block nothing. Threats reserve guard capacity even when unchallenged.
- **Claims on places** are recognitions held by people; they matter insofar as they are recognised and enforced. Recognition and enforcement have different geographies.
- **Access control.** Guarding an anchor, route or residence can deny access to resources and to contact. It never creates consent or ownership of people.
- **Regions** are the natural units for territorial analysis, patrols and supply.

**Influence overlay \[display only; V\].** For maps and analysis, influence at x from group g is

```latex
I_g(x)=\sum_{j\in \text{credible responders}}\frac{\hat F_j\,\mathbf{1}(\text{arrival}_j\le 0.5\ \text{SD})}{1+[\text{distance}(x,j)/3\ \text{km}]^2}
```

accounting for willingness, existing reservations, message delay, travel and supplies. A place is shaded for a group only if its influence exceeds the next by 25%; otherwise it is marked contested. The overlay is a display convention, never an exclusion, battle or ownership rule.

#### 36.4 Settlements

Settlements are not placed. They emerge where people repeatedly sleep, store, work and meet. Their attributes (population, stores, connectivity) are computed for observation, never used as rules.

### 37. Conflict, raids, occupation and military organisation \[II laws; V values\]

**Hunts, den clearing, defence, raids, conquest, rebellion, coups and secession are one kind of process: a collective objective pursued by independent people who pledge, assemble, engage and settle, resolved by one contest law.** War is an outcome of ordinary choices under real force, supply and risk.

#### 37.1 The collective objective process

```text
discover → propose target, division, supply and route → conditional pledges (bounded communicated rounds)
        → lease supplies and time → assemble and travel → negotiate | flee | engage
        → loot | clear | occupy → hold | withdraw → settle shares and losses
```

- Proposers contact a bounded number of known people or subordinate leaders. Feasibility is established only from communicated pledges and their leased contributions (§26.5); no component reads private stocks, schedules or willingness.
- Each participant decides from their own forecast of success and failure branches. With gain G, loss L on failure and unavoidable cost C, participation is attractive only if p > (L + C)/(G + L), counting real opportunity, care, rest and risk once.
- The same loot cannot fund multiple promised divisions. Support, opposition, neutrality, defection and flight are individual choices.
- There is no conquest reward, rank reward or mating reward of any kind.

#### 37.2 Engagements

Only present, capable adults contribute force: Fight ability × c × (1 − w) × fatigue factor × relevant weapon effect, then the contact–cover complementarity in force units (§28.3) once. Hunts use the hunt roles. Terrain and an occupied intact outpost's factor (up to 1 + 0.4 × integrity) apply once. Rank and q are never force terms.

```latex
p_A=\sigma\big[2\ln(F_A/F_B)\big]
```

Equal force gives 0.5; 2:1 gives 0.8. Positive force beats zero resistance; zero against zero produces no victor. Decision-makers use estimates; the resolver uses actual force. A reference engagement lasts 0.04 SD and is resolved by one keyed outcome draw; arrivals, withdrawals or incapacity close or update it at the actual event.

**Injury and death \[V\].** Each participant's injury probability per reference engagement is 1 − exp\[−0.50 × (opposing force fraction) × l / (1 + 0.50 Q d\_protection)\], with l = 1 for winners and 1.5 for losers, scaled by duration. Injury adds wounds (§22.3); conditional fatality probability is clip(0.05 + 0.30 w\_before, 0, 1). Winners can die.

**Extension interface.** The contest law exposes a typed interface (participants, positions, force contributions, effect geometry, duration, outcomes) so that later laws for ranged, area or structural effects extend the resolver without touching any mind (§41.3).

#### 37.3 Outcomes and holding

- **Raid.** Loading takes at least 0.03 SD plus handling and hauling, limited by goods and cargo; loot is a contested taking (§20.7). A raid produces transported loot, not annexation.
- **Occupation.** Requires 1 SD of supplied, capable, unopposed local presence. Resistance freezes progress, abandonment erodes it, a successful counterattack resets it. Completed occupation changes custody, not recognised ownership, office scope or distant allegiance.
- **Conquest** requires continuing assets, supplies, local custodians and enforceable control; settlements then negotiate new commitments or remain contested.
- **Den clearing** ends replacement; surviving animals remain.
- **Coups** target the root control or office arrangement, not every remote subordinate asset.
- **Secession** is assessed over 12 SD against plausible reachable responses, never a census of the enemy.

#### 37.4 Military organisation

A military group is an ordinary group whose roles include combat, scouting, supply and command. Its members remain individually fed, committed and vulnerable; a campaign is a project; marching is Move; supply is hauling and storage; command uses the attention law (§28.4); orders are communicated under role scopes. Defeat, desertion, starvation on campaign and failed assembly are ordinary outcomes. Expansion is a funded strategic project valued through actual resources, routes, protection and contact; it may indirectly change reproductive opportunity, but defeating someone never grants a partner, a child or ownership of an adult.

## Part VIII — Evolution and observation

### 38. Long-run evolution, selection evidence and scientific interpretation \[I–II; V values\]

**The experiment succeeds or fails on multi-generation evidence: whether reproductive inequality emerges, whether it tracks prior competitive success, how culture accumulates or is lost, and how inherited factors actually change.** Measurement is analyst-only and never feeds back into the simulation.

#### 38.1 The canonical founding world \[V\]

- **Founders:** 96 unrelated adults, 48 M and 48 F, ages uniform 18–40 years, with the genetics of §23.1; c = 1, w = 0, d = 0.15, f = 0.65; dispositions drawn (§10.2).
- **Founder histories:** developmental ratios uniform in \[0.70, 0.95\], independent of genotype and class. Prior practice budget uniform in \[18, 48\] work-SD, capped at 0.30 × (age in SD − 36). One lead domain uniformly; practice split by a Dirichlet draw with concentration 4 on the lead and 1 on the others; each mastery x = P/(12 + P). Declared prehistory, not simulated childhoods or professions.
- **Founding culture:** the common repertoire and priors of §47.6, shared by all founders; no founder knows the scenario's founder-unknown schemas.
- **Social state:** no bonds, households, groups, institutions, offices, ties, success evidence, satiation, partner histories or pregnancies.
- **Geography:** eight distinct, mutually reachable resource basins, twelve founders placed in each as a spatial sampling rule only, on passable cells with a physical resource and refuge route. Each founder has a personal cache with 2 quiet-food SD, an initial endowment. 72 food nodes (nine per basin) at 50% stock, eight of them tool-gated fishing nodes; one wood and one fibre node per basin at 70%; six finite 120-unit stone deposits (including the glassy kind of §47.6); eight prey habitats at half biomass; six full predator dens (five ordinary, one apex) outside starting camps.
- **Initial personal evidence** is only current perception, own cache records, declared training and the common repertoire. Optional founder familiarity is a separate declared prehistory profile.
- **Closed world:** no immigration, refreshed alleles, rescue births, gifted knowledge or mandatory unions. Seeds are never rejected because a particular future would lose.

Scenario packs (frontier, scarce, long-journey, production-rich, wrong-prior) are declared variations used for development and comparison.

#### 38.2 Scale

The operating range is roughly 100–400 living people across several groups. These are investigation and runtime ranges, not caps, targets or claims that the ecology sustains 400. A named technical resource limit pauses with a saved state; it never kills people or suppresses conceptions.

#### 38.3 Selection evidence

- **Success before reproduction.** For age-, cohort- and opportunity-matched Ms, measure a predeclared analyst-only competitive composite (standardised productive and hunting surplus, combat and defence effectiveness, organising contribution, accessible resources and credible control), measured before the reproductive window and never counting one victory several times. Initial evidence goals \[V, hypotheses\]: the high-sire decile at least 0.3 within-cohort SD above others; positive adjusted association; enrichment in at least one consequential domain. Appearance-driven skew without competitive enrichment does not establish the central hypothesis.
- **Regime bands to investigate \[V, hypotheses, never quotas or feedback targets\]:** F direct material contribution often 25–45% with task and life-stage breakdown; mature F primary-bond prevalence 65–90%; mature M unpaired share 20–45%; extra-pair conceptions 20–50% of conceptions to bonded Fs, also reported over all births; top-decile M share of genetic births about 40–70%, with matched cohorts and zeros; at least 90% M share of effective coercive and territorial leadership exposure, administration reported separately.
- **Concentration.** Compare sire concentration with bond concentration on the same people and window, including every eligible M with zeros. No births means undefined inequality, not equality. At small sizes, report actual top-tail counts and equal-share references; living newly adult zeros are censored, not lifelong exclusion.
- **Inherited factors.** Archive both alleles of every factor for every person. Report allele-copy and pair-mean distributions, the 7 × 7 covariance, heterozygosity, derived potentials and saturation, circular statistics for θ and ψ, and selection differentials Cov(z, w)/mean(w) for completed cohorts, with w defined separately as live births, offspring surviving to adulthood and offspring later reproducing, separately for M and F. Phenotypic enrichment and genetic response are different findings.
- **Cultural transmission.** Report the repertoire distribution over time: methods discovered (with discoverer and route), transmitted (route and fidelity), lost, rediscovered; teacher networks; institutional record survival across holder turnover.

#### 38.4 Measurement snapshots, cohorts and mediation

Metrics read the immutable snapshots recorded at the time of the event, never classifications reconstructed from current social state: extra-pair encounter classification uses the encounter-time bond snapshot; extra-pair conception uses the conception-time snapshot; recognised father at birth is separate; unbonded conceptions are reported separately. Interbirth analysis includes complete and right-censored intervals, mothers without a second birth and age at last birth, and distinguishes noncontact, failed conception, pregnancy loss, birth and child mortality. Use seed-level uncertainty and lineage clustering: one prolific family is not hundreds of independent experiments. Distinguish total association from mediation through resources, contact, attraction and accepted encounters. A high-sire tail cannot prove a coercive reproductive mechanism absent from the model.

#### 38.5 Diagnostics and sustainable livelihood

- **Livelihood classes.** Distinguish physical opportunity, personally known opportunity, healthy independence (c ≥ 1 maintained), stable impaired survival, reserve buffering, cooperative viability and independent parenthood (gestation, recovery and overlapping dependant care through 216 SD). Solo diagnostics exclude gifts and free protection but allow personally funded tools and storage, and include actual travel, spoilage, rest, enjoyment, maintenance, danger, care and wear.
- **Analytic fold \[VII\].** For a fixed repeatable plan Y(c) = Y₁c^α with fixed requirement R and η = Y₁/R, the required η(c) = c^(1/2 − α)/√(2 − c) for c ≤ 1. At α = 0.7 the fold is at c ≈ 0.571 with η\_crit ≈ 0.936: below it no positive nutritional equilibrium exists; between it and 1 an unstable lower and stable impaired upper equilibrium coexist, stability requiring α(2 − c) < 1. An upper equilibrium does not guarantee recovery from depletion. This is a diagnostic, not a planner.
- **Ecological ceilings.** Maximum plant renewal at zero stock is 72 × 24/8 = 216 FU/SD; prey renewal adds at most 8 × 32/12 ≈ 21.3. Reachable production is lower. Baseline ecological tolerance for a repeating 12-SD diagnostic cycle: at most 20% integrated non-age mortality over 120 SD.
- **Causal probes.** Accounting ceilings, executable fixed-population budget tests and unrestricted histories are each labelled. Paired explanatory interventions (supplied route knowledge, zero travel cost, zero spoilage, matched competence, funded coordination, supplied method knowledge, matched age structure) are labelled counterfactuals, never baseline corrections.
- **Reproductive pacing.** A controlled fixture with supplied contacts verifies one opportunity per SD and the post-birth curve before full histories compare return settings with other coefficients fixed.

#### 38.6 Scientific interpretation

Every declared assumption of §1.3 can causally contribute to any emergent regime. Reports must attribute patterns accordingly: a named assumption changed in a paired experiment (success-credit eligibility, attraction weights, household cardinality, continuity or history costs, novel-partner cost, optional support, encounter value, complementarity, extra-pair eligibility as an explicitly altered rule, process-value weights) distinguishes the changed assumption from the emergent response. Each probe changes one named assumption initially, though histories then diverge endogenously. Regime bands remain hypotheses, founder endowments remain finite, and negative or null results are valid findings once the mechanisms are correct.

#### 38.7 Experimental discipline

Predeclare configurations, seeds, measurement versions, stopping and censoring rules. Each run records seed, the resolved configuration hash, content and source hashes, numerical and RNG profile, enabled mechanisms, prehistory, intervention lineage, measurement version, exposure, censoring, extinction and technical halts. Begin around 20 complete replicated runs for macro exploration and expand when uncertainty or rare events require; confirm on held-out seeds. Report failures, collapses and extinctions alongside successes. Fix accounting, information and implementation defects before changing any scientific hypothesis, and never tune by feeding a target distribution back into the world.

### 39. Observer and analyst architecture \[III boundary; VI design\]

**Presentation reads committed state and never writes it. The observer view shows what a human watching the world can understand; the selected-person view shows that person's actual knowledge and retained reasons; the analyst view adds hidden truth for science.** None is ever visible to a mind.

#### 39.1 Pipeline

```text
authoritative simulation (worker) → incremental snapshot projection → renderer and panels
```

The worker publishes compact immutable projections at causal times: positions with their current leg anchors, actions, visible equipment and cargo, events and selected-entity details. It never clones or freezes the whole world. The renderer interpolates positions from authoritative leg anchors and holds the last pose while waiting; it never decides arrival, proximity, contact, output, injury, conception or death, and never requests a model update per frame. Cosmetic randomness uses its own domain. Opening any panel, lens or overlay is inert.

#### 39.2 Observer view

| Element | Shows |
| --- | --- |
| World map | Terrain, water, crossings, vegetation; sites sized by observed stock; caches, stores, workshops, outposts, settlements; people with activity cues; journeys; conflicts |
| Person card | Now (action, target, progress); representative interval so far; current intention, envelope and reason (from the trace, including the main rejected alternative); project, frontier and next milestone; obligations; body (intake, condition, wounds, fatigue, enjoyment); cargo and equipment; repertoire (methods known, how acquired, confidence); learning; connections (household, carers, commitments, claims, roles, contacts) |
| Personal lens | That person's perception, remembered places with dated estimates (never live truth), unknown ground, known institutional facts |
| Chronicle | Consequential events: discoveries and first uses of methods, teaching, journeys, tools, stores, births, deaths, bonds, groups, offices, handovers, battles, successions; coalesced and linked to people and places |
| Roster | Sortable comparison by observable attributes |
| Overlays | Households and care; resource, custody and authority flows; formal rights and effective force as separate toggles; method diffusion; territorial influence (§36.3) |

Explanations come only from the stored decision trace and evidence. A generated explanation must not invent a reason absent from the actor's retained record.

#### 39.3 Analyst view

- **Five-layer capability:** inherited factors and potentials; development; masteries and paid gains; contextual task capability; body, load and equipment modifiers; realised output beside them.
- **Hidden truth:** genotype, pedigree, true sire beside recognised father and actual caregivers, kin classes, fertility state, hazard budgets, method schemas that would match untried combinations, full institution records, evaluator budgets.
- **Decision forensics:** full traces, agenda admissions and deferrals, envelopes and escalations, effort spent, evidence and versions, forecasts against realised outcomes, rejected options with reasons.
- **Metrics:** the measurement dictionary (§44.5) and selection evidence (§38.3).

Analyst truth never updates personal knowledge; a social father's observer view is never coloured by hidden non-paternity.

#### 39.4 Look and feel \[VI\]

A charming, readable top-down 2D or light 2.5D world with small modular characters, organic vegetation and terrain consistent with the causal raster. A compact animation vocabulary (idle, walk, run, sleep, eat, carry, forage, chop, mine, hunt, craft or build, try, train, teach, guard, talk, care, brief non-explicit romantic cue, fight, stagger, death), with visible items driven by actual inventory and equipment. Depleted sites look sparse; structures show integrity; worn trails accumulate from actual traversals and are cosmetic unless a declared law gives them effect.

#### 39.5 Playback

Pause, step to the next consequential event, playback from about 0.25× to 10× (15 real seconds per SD at 1×), and maximum speed; seed and configuration display; save and load; pan, zoom, minimap, follow, jump to event. When hardware falls behind, presentation falls behind visibly; model fidelity never changes. Observer saves store presentation state separately from the causal checkpoint.

## Part IX — Computation

### 40. Compute, locality and technology stack \[III doctrine; VI choices\]

**Cost must scale with people, local neighbourhoods, genuinely active obligations and actual reviews, never with the size of the world map or the content catalogue. Total cognitive work is bounded by the shared effort account. Speedups are claimed only when measured.**

#### 40.1 Work scaling

Let N be living people, Q pending events, D affected due records, R touched relationships, L local query results, W reviews and B the effort budget.

| Work | Required cost shape |
| --- | --- |
| Representative closures | O(N + affected D + active R) per SD |
| Local event | O(log Q + touched causal records) |
| Perception | Local spatial buckets and actual visibility work |
| Review | ≤ B effort units + indexed access overhead + affected mandatory records; no population or catalogue scan |
| Valid continuation | Affected dependencies and the next operation; no option comparison, no route search |
| Runtime repair | ≤ repair allowance; deterministic, no comparison |
| Routing | Bounded expansions charged to the account, amortised by personal region summaries |
| History append | O(new records), never copying prior history |
| Rendering | Visible and interpolated entities and changed chunks, independent of cognitive cadence |
| Memory | Grows with people, actual relationships, active tasks and storages, institution records, world cells, repertoires and archived pedigree |

Dense crowds, many active obligations and battles create genuine additional work. The requirement is not constant total cost; it is that unused content adds no per-review work, that locality and indexing avoid unrelated work, and that nested cognition cannot multiply hidden work.

#### 40.2 Forbidden patterns

All-pairs scans (attraction, kinship, relationships, collisions); map-wide resource searches by minds; per-review scans of the method catalogue or of irrelevant records; nested estimators with fresh budgets; full-state cloning or freezing for presentation; re-sorting event arrays on insertion; linear entity search in hot paths; full deliberation after every small step; unbounded candidate generation, recursive planning or rollouts; review loops on already-crossed thresholds; copying lifetime history on append; computation that grows because the feature catalogue grows; and deleting or suppressing causal records, people or births for performance.

#### 40.3 Data architecture \[VI\]

Dense fields (terrain, move costs, visibility, coverage bitsets) in typed arrays; hot person columns in typed arrays where profiling justifies it; sparse records (ties, commitments, storages, items, projects, repertoires, institution records) in semantic-key-indexed tables with secondary indexes (spatial hash, due-time, method-by-effect, by-owner, by-location); no mandatory entity–component framework; history as compact append-only logs plus checkpoints at committed boundaries.

#### 40.4 Instrumentation and reporting

The kernel counts, per living person-SD, everything listed in §17.8 plus events, perception queries and settlements. Cost is reported by **causal workload** (reviews, active obligations, crowd density, engagements, births) as well as per person-SD, and always with living exposure, so that a dying cohort is never mistaken for efficiency and a world that genuinely does more is not judged against one that does less. Fixed-density and crowded cases are reported separately.

#### 40.5 Engineering targets \[VI\]

Median and 95th-percentile cost per SD on a named reference machine, measured, never assumed. Provisional targets: tens of people 15 / 30 ms; 96 people with dependants and obligations 120 / 250 ms; 400 people with logistics and conflict 500 / 1,000 ms. Presentation goals: responsive 30–60 frames per second at normal view and sustained 10× playback for representative mature worlds. These are engineering acceptance targets, not scientific constraints; a machine-specific budget is recorded before use as a pass criterion. Missing one is fixed by representation or algorithm, never by deleting a causal distinction or silently simplifying expensive actors.

#### 40.6 Technology stack \[VI\]

| Layer | Choice | Reason |
| --- | --- | --- |
| Simulation core | TypeScript, pure (no DOM, renderer, clock, filesystem or network) | Shared by browser and headless runners; sufficient when the representation is right |
| Browser execution | One dedicated Web Worker owning mutable state | Responsive interface; one deterministic owner |
| Headless execution | Node runner over the same core | Accelerated multi-seed science |
| Rendering | PixiJS on WebGL, fed by snapshot projections | Hundreds of sprites with smooth interpolation |
| Interface panels | Lightweight DOM | Inspectors, chronicle, controls |
| Native kernels | Rust/WASM only for a profiled hot kernel with a small stable interface and numerical conformance | Avoids doubling build and debugging surface |
| Parallelism | Across experiment seeds, not within one world | Determinism without concurrent mutation |

The architecture, not the language, determines cost. A native or engine rewrite would add migration work without removing causal or control complexity.

## Part X — Extension, staging, proof, validation and build

### 41. Generative extension protocol and extreme extension tests \[III\]

**Every new capability is added by answering twelve questions in order, and lands in the smallest home that can hold it: content first, a narrow new law when causality genuinely requires one, a general service change only with consumers and an architecture decision record.** A new phenomenon that needs a new mind, controller or persistence architecture is the failure this protocol exists to catch.

#### 41.1 The twelve questions

1. **Law.** What new causal phenomenon is there, and which existing law cannot express it?
2. **State.** What typed world state and units does it need?
3. **Observation.** What can people perceive, experience, read or be told about it, and what must remain unknown?
4. **Existing expression.** Which existing objectives, methods, trial forms and operations already express useful action?
5. **Content.** Which goods, material kinds, method schemas, recipes, item effects, obligation kinds, relation or institution templates, procedures or rule sets are needed?
6. **Learning.** How do actors come to know it: founding repertoire, trial, demonstration, teaching, record? What repertoire records does it create?
7. **Service.** Is a general service change needed, what narrow invariant does it own, and which other capabilities will use it?
8. **Mind.** Why can the existing mind not already reason about it? (The expected answer is that it can.)
9. **Persistence.** How do time, goods, consent, authorization, uncertainty, progress and failure persist?
10. **Invariants.** Which tests protect conservation, locality, information isolation, assent and partition invariance?
11. **Natural use.** In what ordinary circumstance does it become worth doing alongside existing competitors?
12. **Negative case.** In what nearby circumstance must it not happen, proving it is not forced, free, omniscient or automatically successful?

Answers are recorded with the change. Questions 11 and 12 become a natural-opportunity panel and a negative counterexample (§44). Catalogue growth never reveals methods to actors automatically; the extension's migration defines repertoire, observations and endowments.

#### 41.2 Landing rules

- Questions 1, 7 and 8 all "none": **content only**.
- Question 1 names a law: a typed module with declared inputs, touched state, rates or transitions, observable results and an estimate adapter, and no selection of anyone's purposes. New scientific laws need no second consumer.
- Question 7 names a service change: at least two prospective consumers and an architecture decision record (§46.4).
- Question 8 does not answer "it can": work stops and an architecture decision record is written. The usual finding is a missing general mechanism, added for everyone.
- Every extension passes the content linter and the extension diff test (§4.5).

#### 41.3 Extreme extension tests

| Extension | What genuinely must be added | What is reused unchanged | Decisive negative case |
| --- | --- | --- | --- |
| Fishing spear | Content: fish good, fishing site kind, spear recipe, item effect gating extraction, cultural prior for fish along rivers | Mind, runtime, ledger, capital ledger (option capital), trial and repertoire paths | No known water within reach: nobody makes spears; hidden fish cannot affect the first decision |
| Ships | Laws and state: vehicle containers, propulsion and navigability, crew and passenger positions, transit exposure; content for hulls and routes | Personal ledgers, assent, cargo accounting through carrier chains, movement service extended by the vehicle law, envelopes | A walking-speed multiplier is not accepted as a vehicle law; no navigable water means no ships |
| Roads | Law: construction, terrain-cost modification, maintenance; evidence of road existence | Projects, coupled construction work, shared-capital valuation through personal use and negotiated returns | A road nobody uses is not valued by its builder at others' benefit |
| Money and credit | Content: token goods or claim tokens; laws: issuance, acceptance as recognised social fact, debt, settlement, collateral | Ledger with debt records, proposals, recognitions with audiences | Belief in acceptance creates no global price or backing; unaccepted tokens buy nothing |
| Writing and bureaucratic records | Law and state: located information artefacts with authorship, provenance, reading requirement, copying and access; literacy as a learnable method | Evidence service (reading as a channel), institution records (custody), procedures | A record no one can reach or read informs no one; no global inbox |
| Guilds | Content: membership template, dues, shared workshop, offices, sanctions | Institution records, roles, procedures, mentorship and method transmission | Members with better outside options exit; membership alone gives no skill |
| Religion | Law, if belief itself is modelled: credence dynamics and transmission, a declared preference term; content for rites and offices | Mind (a new preference term is content of the preference model through an adapter), institutions, Attend | A membership table alone does not simulate belief or sacred obligation |
| Disease | Laws and state: exposure, transmission, body processes, perception of symptoms, uncertain risk | Hazard budgets, anchored laws, evidence, risk policy | No disease-specific mind; healthy isolated people are unaffected |
| Radically different household law | Content and relation-law changes: cardinalities, exclusivity obligations and their observable breach, enforcement options | Mind, arbiter, care responsibility, consent invariant | Formal rule change alone moves no goods and reveals no sire |
| Radically different succession law | Rule-set content and transition law | Institution records, handover, recognition audiences | A rule nobody knows or recognises changes nothing |
| Contested person-status institutions (only as a separately named experiment) | Explicit imposed-status claims, confinement and force, coerced duties, resistance, contested recognition | Individual minds and ledgers persist; a person never becomes an inventory good; reproductive consent unchanged | Status without enforcement is an empty claim |
| Firearms | Laws: ranged contest resolution through the contest interface (§37.2), ammunition and supply; content for production chains | Production, ledger, logistics, orders, option capital | Missing inputs, training, supply or assent prevents organised use; ownership alone gives no force |
| Industrial production | Laws and state: machines, energy and input streams, maintenance, batches and pipelines, unattended processes, finite storage | Recipes and work-in-progress, authorization for operation, projects, institutions | Human time is not charged per machine-hour; unmaintained machines stop |
| Extreme weapons (architectural thought experiment) | Laws: area-effect resolution, structural damage, persistent hazard fields, long-range report propagation; no construction detail is in scope | Everything above; deterrence emerges from credible threats | Ownership produces no effect without supply, staffing and orders |

Some of these genuinely require new narrow laws or a general service extension (vehicles extend movement; writing extends the evidence service with a channel). That is legitimate. What must not change is the ownership of choice, evidence, authorization, time, physical effects and continuation. A different ecology changes terrain parameters, species, renewal and cultural priors (uninformed and weak for unknown terrain) and reuses everything else.

### 42. Implementation decomposition and growth architecture \[III order; VI scheduling\]

**ESS is built in four macro stages and seven micro stages, followed by a continuous experimental programme. The first macro stage carries most of the architectural difficulty; later stages add new causal laws and much richer societies over machinery that already exists.** Stage size reflects architectural difficulty and causal dependency, not the number of visible features. The historical L0–L42 structure is retired as the implementation roadmap; it survives only as a non-normative record of causal dependencies (Appendix A).

#### 42.1 How the decomposition is derived

A stage boundary exists only where a genuinely new causal or architectural capability must be proven before more is built on it. Applying that test to the mature model yields four boundaries:

1. **The general substrate** (kernel, world and evidence boundary, one mind with its effort account, exploration and repertoire growth, persistent projects, authorised execution, goods and transformations, the social protocol, institution-record semantics, determinism and observability) must exist and be falsified before anything else is meaningful. Its most dangerous assumptions (exploratory agency, deep projects, authorised repair, end-to-end isolation, independent refusal, bounded total work, partition invariance) are tested here, cheaply.
2. **Many independent adults interacting** (exchange, coupled work, shared assets, teaching, messages) stress the protocol, the effort account and the evidence boundary at social density for the first time, and introduce the first narrow social laws. Almost everything else here is content.
3. **The life course** introduces a new family of biological and relation laws, hidden biology that must stay hidden at scale, and the multigenerational time dimension on which the experiment's central question depends.
4. **Power across distance** introduces office recognition, delegation and administration through procedures, group-scale contest, occupation and territory, institutional continuity under holder turnover, and the full 400-person workload.

Everything after the fourth boundary is either content, a narrow law with its own fixture, or experiment. None of it needs a new stage.

#### 42.2 The stages at a glance

| Stage | What the simulation can be | New general machinery | Laws and content added | Micro stages | Gate |
| --- | --- | --- | --- | --- | --- |
| **I — Foundation** | Autonomous heterogeneous adults living, exploring, learning, investing and building in a finite world, with an independent other who can refuse | All of the substrate | Founding physiology, ecology, learning, task expression, material effects, minimal engagement; food, rest, leisure, cargo, caches, wood, stone, tools; a second content-only chain; founder-unknown schemas | I.1 Core; I.2 Social boundary | **Adoption Gate** (Tier 3 architecture review) |
| **II — The cooperative band** | A band economy: trade, joint hunts, shared stores, workshops, teaching and diffusion of methods, crews and custodians, messengers | None expected | Exchange, joint-task, mentorship, membership and custodianship laws; coupled work and coordination; hunt and defence engagement; messenger channel; production depth content and full predator ecology | One wave | Tier 2 stage gate |
| **III — Life course and lineage** | Families, children who grow and learn, deaths and estates, generations turning over | None expected | Genetics transmission, fertility, pregnancy, birth, development, kin gate; attraction, readiness, household, care, recognition, estate laws | III.1 Biological core; III.2 Autonomous life course | Tier 2 plus focused law review |
| **IV — Power, institutions and territory** | Patrons and clients, offices and figureheads, administration across distance, raids, occupation, territories that grow and fragment | None expected | Patronage, coercion, access control, delegation, procedures at scale; office, succession, group contest, occupation, influence; secession | IV.1 Dependency and administration; IV.2 Office, conflict and territory | Tier 2 plus focused scale review |
| **Experimental programme** | The canonical experiment run across seeds and generations | None | Scenario packs, presentation completeness, measurement, later extensions as micro increments | Continuous | Experimental discipline (§38.7) |

Dependency order is strict: I → II → III → IV. Observer views, analyst views and measurement reducers grow inside every stage, never as a deferred final stage.

#### 42.3 Stage I — Foundation

**Purpose.** Build the whole substrate once, prove it general on early consumers, and falsify its dangerous assumptions before any further investment.

**I.1 Core.** Kernel (semantic keys, phases, anchored laws, keyed randomness, continuation-sufficient checkpoints); world services (navigation with personal geography, ledger with transaction kinds, material effects); evidence service (perception with detection, occupancy inference, contextual outcomes, repertoire, isolation filter); the mind (agenda with cursors, typed arbitration, effort account, wake discipline); trial grammar and repertoire growth; persistent projects with frontiers and completion tails; the runtime with envelopes and repair; founding laws and content; one roaming predator with minimal escape and defence. Minimal observer: map, person card with intention, envelope, reason, main rejected alternative, repertoire and progress. Proof dimensions P1, P2, P3 and the adversarial cases of P5 that need no second person (§43).

*Checkpoint:* P1–P3 and their P5 adversaries pass, or the failing boundary is revised before I.2 begins. This is a falsification checkpoint, not a review meeting.

**I.2 Social boundary.** The social protocol (versioned proposals, responses, leases, atomic and distributed commit, obligations, breach, excuse), the two-person fixture (P4), one taught-method transmission, the institution-record lifecycle fixture, mid-task save and restore with obligations live, the remaining P5 adversaries, and the P6 panels including the 400-person load probe.

**Watchable state.** Tens to 96 heterogeneous adults visibly gathering, resting, exploring, trying unfamiliar materials, adopting what they learn, caching, making tools, pursuing multi-day projects, fleeing a predator and resuming; two people negotiating and sometimes refusing.

**Acceptance (Adoption Gate).** Every proof dimension passes on its own terms, with the four separate reports of §43.3; no falsifier of §43.4 fires; content lint and extension diff tests show no hidden control. A Tier 3 architecture review is held here and only here by schedule. Passing adopts the substrate; it certifies no society, innovation rate or selection result.

**Scale.** Tens of people; 96; one bounded \~400-person active-load probe (fixed-density and crowded cases separately).

#### 42.4 Stage II — The cooperative band

**Purpose.** Show that independent adults compose into an economy through the existing protocol, runtime and evidence boundary, at real social density, and that methods spread and are lost through real channels.

**Adds.** Ties and reputation; exchange and mutual insurance; coupled work and coordination costs; joint hunts of dangerous prey and full predator ecology with the engagement law; weapons, protection, fibre, fishing, repair, stores and workshops; mentorship and teaching at scale; method diffusion; messengers and reports; groups, roles, custodians and shared stores as the first real consumers of institution records; the coalition label. One implementation wave in recommended order (contact and exchange; coupled work and hunts; shared assets and teaching; messengers).

**General machinery introduced.** None expected. Any need is an architecture decision record and triggers Tier 3.

**Watchable state.** A band of 32–96 adults foraging, trading in pairs, hunting in coordinated parties, building stores and workshops, teaching apprentices, forming crews, carrying news.

**Acceptance.** Tier 2 gate (§42.9): invariants; directional tests for every new option; natural-opportunity panels with ordinary competitors and negative cases (no trade without differing valuations; no cooperation where coordination costs exceed surplus; no teaching without a learner who values it); cost by causal workload at 32 and 96 with dense agreements and crowded gatherings; observability of every new state.

#### 42.5 Stage III — Life course and lineage

**Purpose.** Prove the biological and relation laws, keep hidden biology hidden at population scale, and run the first multigenerational histories.

**III.1 Biological core.** Genetic transmission, fertility opportunity, conception, pregnancy and loss, birth, post-birth return, development from care and food, juvenile size and participation, kin gate, mortality, validated with controlled fixtures that supply contacts and care (execution correctness, pacing, exactly-once effects, hidden-biology isolation adversaries such as cancelled encounters after hidden conception).

**III.2 Autonomous life course.** Attraction, readiness, encounters, satiation and novel-partner cost; households (trial, bond, establishment, continuity, history); care responsibility; recognition; optional support; childhood supervision and practice; death, estates (liabilities first) and the three inheritance channels; intergenerational teaching; measurement snapshots; first multigenerational runs from the canonical world.

**Watchable state.** Couples and households forming and dissolving, pregnancies becoming known, children carried, fed, taught and growing into adults, deaths, estates divided, methods passing between generations.

**Acceptance.** Tier 2 gate plus a focused review of the new laws' conformance, their hidden-state adversaries (paired worlds varying hidden conception and remote death) and snapshot correctness; the full encounter-to-development chain occurring autonomously; at least three simulated generations run without technical failure (scientific regime outcomes are reported, not required).

**Scale.** 96 founders through at least three generations; roughly 100–250 living.

#### 42.6 Stage IV — Power, institutions and territory

**Purpose.** Prove institutional continuity, administration across distance and group-scale conflict at the full workload.

**IV.1 Dependency and administration.** Patronage and extraction terms; threats, imposed demands and contested taking at scale; guards and access control; delegation and standing envelopes at scale; procedures and due records; remittance over distance; handover and holder turnover; practical independence.

**IV.2 Office, conflict and territory.** The office template and recognition audiences; succession transitions; group-scale contest; raids with loot as contested taking; occupation; military organisation and logistics; territory and the influence overlay; secession and fragmentation.

**Watchable state.** Patrons and clients, custodians and stewards, chiefs who become figureheads, messengers between settlements, raids, occupations, territories that grow, hold and fragment.

**Acceptance.** Tier 2 gate plus a focused review of institutional continuity (holder death leaves records, liabilities and pending cases; distant members learn late; successors lack private knowledge), distributed pledge semantics, formal versus effective control, and cost at \~400 living with logistics and conflict.

#### 42.7 The experimental programme

After Stage IV no further development stage exists. The programme runs the canonical experiment and its scenario packs across seeds and generations, completes presentation and the measurement dictionary, and calibrates only under the discipline of §38.7. It begins with the first multigenerational runs at the end of III.2 and becomes the primary activity after IV.2. Later extensions (writing, vehicles, money and credit, disease, religious credence, norm-change laws, mate guarding, industrial production) enter as micro increments, each with its own fixture, negative case and gate, inside this programme.

#### 42.8 New content versus new causal capability

| Addition | Kind | Stage boundary? |
| --- | --- | --- |
| Another tool, recipe, good, resource or terrain | Content | No |
| Fishing, a new production chain, another trade good | Content | No |
| A new exchange or insurance form | Content over the protocol | No |
| A new institution template, office, role or procedure | Content over institution records | No |
| A new inheritance or succession rule | Rule-set content | No |
| A founder-unknown method | Content | No |
| Reproduction, development, inheritance | New law family plus multigenerational time | Yes (III) |
| Office recognition, group contest, occupation at scale | New laws plus scale | Yes (IV) |
| Writing | Narrow law plus an evidence channel | No; micro increment with fixture |
| Vehicles | Law plus movement-service extension (ADR) | No; micro increment with fixture and Tier 3 for the ADR |
| Disease | New laws over existing hazard and evidence machinery | No; micro increment |

If adding fishing, another tool, another exchange form or another institutional template ever requires a major architecture milestone, the architecture has failed and the anti-patch order (§46) applies.

#### 42.9 Review tiers

| Tier | What | When |
| --- | --- | --- |
| 1 — Continuous | Invariant, directional and isolation tests; content lint and extension diff; determinism and partition invariance per commit | Always; no meeting |
| 2 — Stage gate | Acceptance criteria of the stage; natural-opportunity panels and negative cases; cost by causal workload; observability; receipts separating implemented, tested, visually inspected and scientifically investigated | End of each macro stage, and at each micro increment of the programme |
| 3 — Architecture review | Conformance of the substrate to Levels I–IV | Scheduled only at the Adoption Gate; otherwise only when an architecture decision record is proposed or a falsifier fires |

Ordinary implementation continues without review when changes are content or laws that pass Tier 1, when a scientific law ships with its fixture, or when parameters change inside a declared experiment. A focused law review at the Stage III and IV gates examines the new laws only; it is not an architecture re-audit.

#### 42.10 Why four stages

Fewer would merge boundaries that fail for different reasons: folding the band into the foundation would leave the adoption decision waiting on production depth; folding the life course into the band would mix the first biological law family with the first social laws, so a failed household could not be told apart from a failed exchange; folding power into the life course would test office, contest and 400-person scale before generations exist to inherit them. More would split content waves that share machinery, recreating per-feature milestones and their repeated integration and review overhead. Seven micro stages provide fault isolation exactly where a new boundary is first exercised (core versus social protocol; biological laws under fixtures versus autonomous choice; administration versus conflict), and nowhere else.

### 43. Architectural proof and falsifiers \[IV\]

**Before the mature build proceeds, a small, watchable, deterministic proof must show that one substrate generates the essential early behavioural space without special controllers, composes surprises, lets people learn what they did not know, meets an independent person who can refuse, and survives adversarial boundary tests at measured cost.** It is designed to fail if the architecture is wrong. It is not a full simulation build: it is implemented as micro stages I.1 and I.2 (§42.3), and its six proof dimensions are logical dimensions, not six sequential milestones.

#### 43.1 Scope

- **People:** heterogeneous adults; tens first, then 96; one bounded \~400-person active-load probe in declared world sizes and densities.
- **World:** the canonical spatial model on the natural scenario plus at least one frontier, one scarce and one wrong-prior variant.
- **Content:** food sites, wood, stone (including the glassy kind), one work tool, caches, rest and leisure, one roaming predator, the founding repertoire and the founder-unknown schemas of §47.6; for P2 a second chain added purely as content.
- **Machinery:** everything of Stage I (§42.3), with the founding laws.
- **Presentation:** a simple map with interpolated motion and a person card showing intention, envelope, reason, main rejected alternative, repertoire with provenance, project frontier and task progress, read from the decision trace.

#### 43.2 The six proof dimensions

| Dimension | Smallest decisive evidence |
| --- | --- |
| **P1 Physical foundation** | Food, rest, leisure, cargo, caches, one tool, paid movement, evidence, learning, interruption and resumption, inquiry and investment, all through one arbiter and one runtime. Inquiry and investment begin **before selection**, with ordinary alternatives present. A poor but positive livelihood leads to inquiry; at least one comfortable person with slack chooses an affordable inquiry while a nearby costly or no-slack case declines; empty search lowers repeat search of the same ground while a dynamic question can reopen on new evidence; the tool chain is chosen where it pays and declined where inputs are distant or use is rare; food, danger, blocked-route and stale-source interruptions preserve paid progress; long work survives closures and mid-task restore with no free output |
| **P2 Composition** | A second chain added purely as content (fish site kind, fish, spear recipe, item effect) is used where a known river and nearby materials exist and not elsewhere, with zero change to the arbiter, runtime, ledger, persistence or movement service. Changing an input list or delivery location adapts binding without code change. A serial dependency longer than one review's expansion budget progresses across several reviews; an equally deep cyclic chain without startup stock defers or fails honestly; a complementary bundle is considered before any component pays alone |
| **P3 Exploratory agency** | A person autonomously chooses a T1 trial (a known striking operation on the unfamiliar glassy stone) whose useful result (edge-flaking) is absent from their repertoire; the observed outcome installs a provisional method; later the person exploits it in tool making; a matched expensive trial, and a context repeatedly unrewarding to that person, decline. In a coupled world where the schema does not exist, choices are identical until the outcome is observed. No discovery quota, target bonus or catalogue nomination is used |
| **P4 Independent social boundary** | A proposes barter or a service on exact terms; B independently accepts, refuses or counters. Crossed counteroffers never combine; a response to a superseded version is void; leases are finite; interruption, partial delivery where allowed, cancellation and failure are handled by the common runtime; a mid-task restore preserves leases and obligations; an obligation outlives its failed execution task; one taught-method transmission reuses the same setup. **P4b institution-record lifecycle:** a holder disappears; the record, its liabilities and its pending cases remain; distant members' projections are unchanged until a message arrives; a successor acquires the role but none of the predecessor's private knowledge |
| **P5 Boundary adversaries** | Coupled hidden-world cases (unseen depletion; remote death of a counterparty; remote theft from the person's own cache; irrelevant hidden entity creation; schema existence) leave views, wake streams, agenda admission, choices and repairs identical until a perceptible consequence differs. Unauthorised repair: a blocked path admits an authorised detour, while a cheaper path through forbidden exposure, a supplier substitution, a changed counterparty or an appropriation each wakes the mind. Irrelevant content growth (ten times more unused goods, methods and templates) leaves per-review effort and choices approximately unchanged. No-effect partitioning (extra no-op events, observer reads, checkpoints, diagnostic sampling) leaves the causal digest unchanged, while a genuine change of activity changes physiology. Save and restore; observer inertness. All reuse P1–P4 fixtures |
| **P6 Natural and compute panel** | Tens of heterogeneous adults, then 96; a bounded \~400-person active-load probe at fixed density and crowded. Report effort units by operation class, route expansions, wakes by tier, cause and drop reason, active obligations, pinned records, living exposure and correctness. A dying 400-person world is not ecological success |

#### 43.3 Four separate reports

Every dimension reports four things separately, and passing one is not passing all:

1. **Execution correctness:** conservation, paid time, locality, isolation, partition invariance, determinism.
2. **Autonomous consideration and choice:** the behaviour was considered and chosen by the person against ordinary competitors. Preselected tasks prove execution only; a synthetic taught technique proves acquisition and transmission, not spontaneous creativity.
3. **Composition without bespoke control:** no content-identity branch, no new persistence or budget state, no new scheduler; lint and extension diff tests clean.
4. **Measured cost:** effort, routing and wake counters with living exposure.

#### 43.4 Falsifiers

The architecture is wrong, and must be revised at the failing boundary before further building, if any of these occurs:

- Sensible caching, inquiry, trials or tool making require behaviour-specific branches, guards, bonuses, quotas or protected slots.
- The second chain or the input change requires changes to the mind, runtime or services.
- No unfamiliar-property trial is ever chosen without a target bonus, or discovery requires a hidden catalogue nomination or guaranteed success.
- A chain longer than one review's budget is unreachable, or the frontier grows without bound.
- An unauthorised repair proceeds without escalation.
- Any coupled hidden-world case diverges before a perceptible consequence.
- A second person requires a joint utility optimiser, a feasibility solver over private state, or a separate scheduler.
- Nested estimation exceeds the shared account, or irrelevant content raises per-review cost materially.
- A no-effect partition changes the causal digest.
- People thrash despite the incumbent margin and real switching costs, or wander aimlessly or stagnate permanently in ways the registered policy cannot correct across seeds.
- The apparent simplicity has moved into callbacks, unbounded planning or very frequent full review.
- Success is obtained through hidden truth, prepaid output, forced actions, omitted costs, weakened biology, or agents dying.

#### 43.5 Rules of the proof

No line-count target, promised speedup, forced behaviour, new ecological subsidy or per-seed preference tuning may be used to pass. Stop once the discriminating cases establish the boundary or expose a blocker; do not run multi-generation campaigns. On failure, keep the physical services and science modules, identify the failed interface from the trace, revise it coherently and repeat the discriminating case; never stack compensating controllers onto the foundation. Equal CPU with materially simpler and more generative control justifies proceeding; it is not advertised as a speedup.

#### 43.6 Not in the proof

Households, pregnancy, development dynamics, offices, armies, states, markets, the full observer and analyst interface, machine learning, language-model agents and native kernels.

### 44. Validation doctrine \[IV\]

**Tests protect causality, not histories. Cheap invariant, isolation and directional tests run continuously; natural-opportunity panels run at stage gates; long multi-generation experiments run only when their mechanisms exist.** New implementations will produce different autonomous histories from V1 and V2; that is expected and never a failure by itself.

#### 44.1 Invariant tests (always on)

| Invariant | Test |
| --- | --- |
| Conservation | Every container and the world reconcile goods, backing, claims, debts and leases each SD within declared tolerance, under every transaction kind including contested taking |
| Paid time | Each ledger never overlaps or exceeds one SD; no refunds; cancelled rest earns nothing |
| Locality | No transfer, work or interaction without co-location or carrier chain |
| No borrowing | No consumption of future harvest; no use of unfinished items; no forecast funding; no action after death |
| Partition invariance | Extra no-op events, observer reads, checkpoints, diagnostic sampling and internal partitions leave bodies, stocks, progress, hazard residuals and the causal digest unchanged; genuine activity changes alter them |
| Determinism | Same version, configuration, seed and certified profile give the same digest headless, in the browser, at any playback speed, with any chunking, with inspection open, and across save and restore |
| Observer inertness | Reading, inspecting, tracing and measuring leave the digest unchanged |
| Information isolation | Mind modules cannot import world state; coupled hidden-world cases (§7.6) give identical views, wake streams, agenda admission, choices and repairs until a perceptible consequence; renaming or adding unperceived entities changes no key used by a mind |
| Authorization | No runtime repair changes purpose, counterparty, terms, rights basis, commitments, exposure or spending beyond the envelope without escalation |
| Bounded effort | No review exceeds its account; nested estimators never mint budget; exhaustion records deferral, never impossibility |
| Repertoire | No method enters a repertoire except through founding culture, an observed outcome, demonstration, teaching or a received record |
| Assent and consent | No commitment without assent to the same version by every required party; no encounter without both parties' acceptance and biological eligibility at execution |
| Obligation persistence | Responsibilities survive attention limits, memory eviction, task abandonment, holder turnover and unrelated expiries |
| Exactly once | One conception draw per opportunity; one child per surviving pregnancy; one estate settlement per death; one success credit per event; one settlement per paid prefix |
| Inheritance channels | Genes read only true parents; estates read only recognised relations; changing the hidden sire changes neither recognition nor inheritance |
| Snapshot immutability | Encounter-, conception- and birth-time snapshots never change after recording |
| No free output | Forecasts never commit predicted yield; work-in-progress grants nothing until complete |

#### 44.2 Directional tests

Each changes one interpretable cause, holds other evidence fixed, and names the expected local direction. Examples: a farther source is chosen less; poorer known options raise inquiry; an empty inquiry lowers repeat inquiry of the same ground; older evidence about a dynamic option raises rechecking; greater input distance lowers tool uptake; a larger relevant use raises it; higher spoilage savings raise caching; greater patience raises durable investment; higher familiarity with a target lowers trial selection; frustration in one context lowers repeat trials there but not in an unrelated context; satiated leisure raises the selection of an affordable unfamiliar trial; a serial chain longer than one review's budget advances over reviews; adding irrelevant methods leaves choices unchanged; higher risk tolerance admits riskier options only under the ceiling; a better outside option raises exit; higher credible force raises compliance and an unenforced threat loses force; a lost supply line can defeat an otherwise won occupation.

Directional tests are conditional local comparisons, not aggregate monotonicity promises. Means and held residuals are inspected separately; changing noise alongside cost is not a clean cost test. **Budget sensitivity:** modest changes of every effort and attention budget must not merely repair an otherwise unreachable core behaviour.

#### 44.3 Counterexamples

Every law and every new option gets a positive case (it happens when it should) and a negative case (it does not happen when it should not), with ordinary competitors present. Loading a preselected intention or a finished item proves execution, not choice; both kinds of evidence are needed and labelled.

#### 44.4 Generativity and natural opportunity

- **Generativity tests** add content and assert zero changes to the mind, runtime and services (§43.2 P2), plus a clean extension diff.
- **Natural-opportunity panels** contain an ordinary incumbent, an evidence-accessible alternative and genuine competition. They need not guarantee selection. If a behaviour never occurs, the trace must show where it stopped, in the order of §46.1. Changing preferences before locating the stage is prohibited.

#### 44.5 Measurement dictionary

One versioned dictionary defines every metric: name, unit, source events or stocks, numerator, denominator, window and cohort, snapshot used, inclusion and censoring rules, and the stage that enables it. Unimplemented behaviour is reported as "not modelled", never as a measured zero. Exact counts accompany rates; seed-level distributions and uncertainty intervals accompany pooled values. Turning metrics on or off leaves the digest unchanged. Evaluator-confirmed opportunity is kept separate from personally evidenced channels; an informative empty inquiry is an inquiry outcome even when the evaluator knows nothing was there.

#### 44.6 Performance probes

At stage gates, measure cost per living person-SD and per unit of causal workload with the counters of §17.8 and §40.4 on fixed scenarios at the stage's scales (§42), fixed-density and crowded separately, always with living exposure.

#### 44.7 Long experiments

Multi-generation runs begin at the end of Stage III and become the primary evidence in the experimental programme (§42.7), under the discipline of §38.7.

#### 44.8 Receipts

Every acceptance report distinguishes: implemented; tested (which tests, which seeds); visually inspected (by a named human, recorded separately from automated evidence); scientifically investigated; and still unverified. A draft change is not a completed natural-behaviour gate.

#### 44.9 What not to do

Require V1 or V2 history parity; impose action quotas or frequency targets; run large seed campaigns for every small content addition; calibrate preferences or abundance toward regime bands; assert controller internals or precedence orders in tests; treat a fast run with a dying population as a performance success; roll back a correct world because a ruler failed, an institution did not form or a lineage died out.

### 45. Build doctrine, repository strategy and V1/V2 reuse \[VI; principles III\]

**Build Revision 4.0 as a clean new implementation line. Reuse V1 and V2 deliberately, module by module, only after conformance against this document, and never for their control architecture.** There is no separate build guide; this section is it.

#### 45.1 Repository strategy

- A clean implementation line holds the Revision 4.0 implementation. V1 and V2 remain read-only references with their last states, receipts and fixtures preserved. This document authorises the architecture; it does not by itself authorise creating, archiving, merging, rewriting or deploying any repository.
- Bootstrap only the adopted specification, minimal run instructions, a short authority file stating that this document is the sole normative source, and a compact status record (accepted scope, current blocker, verified commands, next bounded task). None of these may add normative model rules. No parallel constellation of guides, addenda or status essays.
- No history rewriting and no automatic save migration from V1 or V2; old saves run only on their own executables.

#### 45.2 Package boundaries

Packages mirror the organs (§5): kernel; world (state, services, laws); evidence; mind; runtime; social protocol; content and its interpreter; presentation; measurement; runners (worker, headless). Tooling enforces imports: the mind cannot import world state; content packages contain no executable control flow and pass the linter; presentation and measurement cannot write causal state; laws cannot import the mind.

#### 45.3 Build principles

1. **Foundation first and general.** The substrate is built and falsified in Stage I (§42.3) and changed afterwards only by architecture decision record.
2. **Vertical slices.** Each increment runs end to end, headless and visible.
3. **Earned abstraction beyond the substrate.** A shared schema is generalised when a second consumer needs it; a new scientific law needs only its fixture.
4. **Specify behaviour, not mechanism.** Work orders state the behavioural contract, invariants, directional tests and natural-opportunity case; they do not prescribe controller structure.
5. **Cheap tests continuously; heavier gates at stage boundaries; architecture review only as §42.9 says.**
6. **Observability grows with the simulation.** Every new state is visible in the observer or analyst view in the same stage.
7. **Measure performance; never guess it.** Counters from the start; cost judged by causal workload.
8. **No premature tuning.** Causal values stay at the §47 profile until a declared experiment changes them.
9. **Fix architecture, not symptoms** (§46).
10. **Stop only for genuine blockers:** a causal invariant that cannot be met, a fired falsifier, or unusable performance. Everything else is recorded and continued.
11. **Durable increments.** Each coherent increment ends with runnable code, focused verification and a recorded commit where repository work is authorised; unsuccessful work is kept on reversible branches, not erased.
12. **No size promises.** No line-count, file-count or uniform per-stage cost targets; later stages that add real births, communication and conflict cost more because they do more.

#### 45.4 Reuse doctrine

Every disposition below is a hypothesis to be confirmed by conformance tests against this document, not a certification that the old code is correct. Nothing is copied wholesale.

| Area | Source | Default disposition | Conformance condition |
| --- | --- | --- | --- |
| Integer time, hashing, keyed draws, numerical adapter | V2 | Port after conformance | Reference vectors; semantic lineage keys (§6.1); certified profile |
| Genetics, potentials, development, competence | V2 (transmission V1) | Port after conformance | Equations and newborn conventions of §23–§24; no duplicate modifiers |
| Childhood development from food and care | V1 | Reimplement from concept | Interval accumulators and canonical closures (§9.3) |
| Learning reducer | V2 | Port after conformance | Segment closed form; no retroactive mastery |
| Fatigue, enjoyment, body, condition, hazards | V2 | Reimplement from concept around anchored laws | §9.2–§9.3 partition invariance; process-value law (§22.6) |
| Ecology renewal, habitats, dens | V2 | Port with simplification | No duplicate biomass, free harvest or query-dependent state |
| Terrain fields and drainage | V2 with V1 scale | Port with simplification | Canonical raster; same physical and rendered geography |
| Goods, storages, claims, reservations, custody | V1 | Reimplement from concept | One mutable writer; transaction kinds; debts; contested transitions; leases |
| Cargo, spoilage, tool quality and wear | V2 | Port as content | Constants in content entries |
| Event heap with phases | V1 | Port with simplification | Phases of §6.3; generation tokens; exactly-once settlement |
| Known-map routing with resumable frontier | V1, V2 | Reimplement from concept | Personal geography and region summaries; effort-account charging |
| Perception and evidence provenance | V1, V2 | Reimplement from concept | Detection footprints; occupancy inference; isolation filter |
| Renderer interpolation, worker boundary, scene | V1 | Port with simplification | Snapshot projections; observer inertness |
| Observer and analyst interface | V2 | Port with simplification | Reads traces; no hidden truth in actor views |
| Reproduction, recognition, care, household rules and their tests | V1 | Reimplement from concept | Typed laws over the common lifecycle; tests become fixtures |
| Hunt roles and engagement | V1 | Port with simplification | Contest law with force units |
| Conservation, determinism and information-boundary tests | V1, V2 | Port as contracts | Rewritten against public interfaces; extended to §44.1 |
| Diagnostic scenarios and failures | V1, V2 | Port with simplification | Explicit opportunity, prehistory and geometry |
| Decision controllers, exploration subsystem, survival planners, per-domain purpose, funding and retry engines, world classes | V1, V2 | Retire | Counterexample libraries only |
| Controller-internal tests, calibration gate scripts, layer-specific intelligence contracts | V2 | Retire | Replaced by §43–§44 |

Every ported module passes its original numerical tests and the new conformance tests before use. Old seeds are not required to reproduce old histories.

### 46. Anti-patch doctrine and architecture decision records \[III\]

**When a behaviour fails, diagnose before adding anything. Almost every failure is a missing opportunity, a missing observation, an inexpressible representation, an attention starvation, a wrong estimate, a correct loss, an execution fault or an incomplete law, and each has a general fix at its own stage.** The doctrine forbids local patches; it does not forbid learning. When traces and a falsifier show the substrate lacks a genuinely general capability, the architecture is revised through a recorded decision.

#### 46.1 The diagnostic order

Work through these in order, using the decision trace (§6.7), counters and the measurement dictionary; stop at the first "no":

| # | Question | If "no", the fix belongs in |
| --- | --- | --- |
| 1 | **Opportunity.** Does the opportunity physically exist in this world, at this time, within reach? | The scenario or ecology, as a declared variant; otherwise nothing is wrong |
| 2 | **Perception and learning.** Could the person perceive, experience, learn or be told of it? Did they? | Perception, detection, reporting or transmission laws |
| 3 | **Representation.** Can their repertoire, the trial grammar and the binder express it? | Method or trial-form content, or binder generality |
| 4 | **Consideration.** Did bounded attention and admission consider it (agenda, cursors, effort account), or was it deferred? | Index coverage or a general fairness repair; never a protected slot |
| 5 | **Estimate.** Is its estimated consequence sensible given the person's evidence, rates, priors and units? | The estimator, adapter or prior |
| 6 | **Competition.** Is another option correctly beating it, including continuation? | Nothing (a correct loss is not a bug), or a preference change with a recorded scientific rationale as a named experiment |
| 7 | **Execution.** Did runtime execution fail, and was the failure observable and handled within the envelope? | Runtime or service |
| 8 | **Law.** Is the relevant causal law incomplete or wrong? | The law, with its fixture |
| 9 | **Architecture.** Is a genuinely general capability missing from the substrate? | An architecture decision record (§46.4) |

Only after locating the stage may anything change, and the change belongs at that stage. Separate implementation error, scenario inadequacy, policy pathology and a valid but undesired scientific outcome.

#### 46.2 Anti-patterns

| Anti-pattern | Why it is harmful | Do instead |
| --- | --- | --- |
| A protected slot, trigger or admission rule for one behaviour | Encodes the symptom; multiplies with every feature | Fix the perception, representation, consideration or estimate that hid it |
| A bonus for exploring, investing, cooperating or discovering | Hidden objective; distorts every comparison | Correct the forecast of real consequences or the process-value law for all activities |
| An exploration quota or forced wandering | Destroys emergence | Supply opportunity, evidence and fair consideration |
| A domain branch in control code | Every later domain needs one too | Express the difference as content, knowledge or law |
| A new retry, backoff or cooldown state for one behaviour | Duplicates persistence; ignores evidence | Let classified outcomes update beliefs and attempt summaries |
| A scripted start or fixed schedule | Destroys emergence | Supply opportunity and evidence |
| A per-object payback function | Recreates controllers | The capital ledger (§14) |
| A per-behaviour persistence or funding record | Recreates parallel lifecycles | The runtime and envelopes (§16) |
| A nested estimator with its own budget | Hidden unbounded work | The shared effort account (§17) |
| Truth routes, truth queries, analyst data in forecasts, hidden-time notifications | Information leak | Personal geography, belief-only planning, end-to-end isolation (§7) |
| Tuning abundance, fertility or preferences toward a target | Hidden stabiliser; invalidates the experiment | Measure and report; change hypotheses only by declared experiment |
| Calling a history-changing budget "engineering" | Invisible model change | Classify as P or N and version it (§17.7) |
| Deleting a causal distinction or record for speed | Changes the experiment | Fix representation or algorithm (§40) |
| Control flow in content | Hides controllers in data | The content algebra and linter (§4.5) |
| Frameworks for unbuilt stages | Speculative complexity | Earn abstraction with consumers |
| Prescribing implementation counts or line targets | Hardens conveniences into law | Behavioural contracts with resolved policy values |
| Frame-driven or per-step deliberation | Cost and thrashing | Three tiers and wake discipline (§9.6, §17.5) |
| Full-state cloning for the interface | Superlinear cost | Snapshot projection (§39.1) |

#### 46.3 Anti-patch is not anti-learning

A single disappointing seed never justifies a special rule. A general failure demonstrated across seeds and scenarios, located by the diagnostic order at step 4 or step 9, can justify a general repair available to everyone: a better fairness mechanism, a new index, a new trial form, a new channel, a service extension. Such a repair goes through an architecture decision record when it touches Level III, and through amended contracts and tests when it touches Level IV.

#### 46.4 Architecture decision records

Any change to Level III (an organ, an operation family, a wake cause, an arbitration stage, a boundary, a general service, the content algebra) requires a short record stating:

1. the Level I–II requirement that cannot otherwise be met, or the contract-preserving improvement in generality, simplicity or cost being claimed;
2. the evidence: traces, failing tests or fired falsifiers, and the diagnostic step that located the failure;
3. the general mechanism proposed and its consumers (at least two for a shared service);
4. how every Level I–IV contract is preserved, and which tests demonstrate it;
5. measured cost before and after;
6. migration semantics for saves, content and the §47 profile.

Records live in the repository and trigger a Tier 3 review (§42.9). A record that only renames a domain controller is rejected.

#### 46.5 A worked diagnosis \[VII\]

Suppose nobody ever discovers edge-flaking. (1) Glassy deposits exist and are reachable. (2) The trace shows people have seen them, so their glassy property is perceived. (3) The compatibility table lets striking apply to glassy stone, so a T1 candidate is expressible. (4) The trial cursor admitted the candidate in several reviews. (5) Its estimates are sensible: low instrumental prior, positive process value. (6) It lost every time to leisure and production because people were busy with dependants and debts: a correct loss. Discovery should then appear in calmer seasons or among people with slack; if it never does across seeds, step 5 is re-examined (perhaps familiarity is computed on the wrong descriptor), never patched with a discovery bonus.

## Part XI — Reference

### 47. V4.0 Baseline Reference Profile \[V–VI\]

**This profile resolves every causal value the canonical V4.0 baseline experiment needs.** The constitutional sections define each parameter's identity and meaning; this profile gives the baseline value, units and range. For scientific coefficients written inside body equations, the equation is the definition and the headline values are repeated here for reference. For every policy (P) and numerical (N) value, and every scientific value not written in the body, this profile is the only definition. A run resolves the full profile plus declared overrides into one immutable configuration whose hash is recorded; a missing causal value halts the run. A named variant changes listed values and is never called the unchanged baseline.

#### 47.1 Mechanism rules (class C)

One activity ledger per person; one representative closure per person per SD at a fixed key-derived offset; one effort account per review; at most one fertility opportunity per F per SD and one conception draw per opportunity; one child per surviving pregnancy; one active recognised father per child; one primary provisioning bond per F at a time, no fixed limit for M; one estate settlement per death; one success credit per event, split among contributors; one hazard budget per life and cause or per process episode; one held outcome per semantic action; assent attaches to exactly one proposal version.

#### 47.2 Scientific parameters: world, body and biology (class S)

| Parameter | Baseline | Exploration range | § |
| --- | --- | --- | --- |
| Calendar; adulthood; reference generation | 12 SD/year; 216 SD; 300 SD | Fixed | 6, 23 |
| Canonical map | 256 × 192 cells at 0.10 km | Larger by configuration | 8 |
| Radii: sight; outpost sight; work; intimate; audible | 0.60; 1.0; 0.08; 0.01; 0.15 km | — | 8.6 |
| Movement base speed | 80 km per travel-SD | 60–100 | 8.4 |
| Resource abundance scale | 1 × listed capacities | 0.6–1.8 | 19 |
| Food patch; wood; fibre; stone | K 24 FU τ 8; K 30 τ 60; K 24 τ 12; 120 finite | — | 19.2 |
| Prey habitat | 32 FU, τ 12 SD, ≤ 8 animals, spawn 0.75 ordinary / 0.25 dangerous | — | 19.3 |
| Dens; pursuit hazard; danger scale | Capacity 2, replacement (2 − A)/18 per SD; 0.15 \[1 − d/0.8\]₊ per SD; 1 | Danger 0–2 | 19.3 |
| Passive detection | clip(0.95 − 0.75 (r/0.60)², 0.20, 0.95) × occlusion | — | 11.1 |
| Guards; unguarded; surprise factor | clip(0.30 + 0.40 sat(K\_Field), 0.30, 0.70), cap 0.95; 0.10; 0.75 | — | 19.4 |
| Bulk (CU per unit): food, wood, stone, soft; tool, weapon, protection | 1, 0.20, 0.40, 0.10; 0.10, 0.15, 0.10 | — | 20.2 |
| Food spoilage: carried, cache, store, exposed | 0.35, 0.20, 0.06, 3 per SD | — | 20.3 |
| Cache; store | 12 CU, 0.02 work-SD; 80 × integrity CU | — | 20.3 |
| Cargo | C\_nom = 1.5 s\_carry X\_B m(a); s\_carry,F = 0.60^d\_sex; maximum 2 C\_nom | — | 20.4 |
| Item effects: tool; weapon; protection | ×(1 + 0.30 Q d); ×(1 + 0.40 Q d); ÷(1 + 0.50 Q d) | — | 21.4 |
| Wear; structure decay; effect threshold | 0.04 per active work-SD; 0.003 per SD; 0.25 integrity | — | 21.4 |
| Quality: tiers; gates; site factor; preparation | {0.75, 1, 1.5, 2, 2.5}; x\_Make ≥ 0.20 / ≥ 0.60 + workshop; 0.85 outside workshop; +0.15p | — | 21.3 |
| Requirement: B₀; s\_F; maintenance M; loads ℓ | 1 FU/SD; 0.85; §22.1; §22.1 table | — | 22.1 |
| Pregnancy; post-birth; wound supplements | +0.20; +0.15; +0.30w | — | 22.1 |
| Exposure cost | 0.10 B\_quiet u\_exposed / (1 + 0.5 Q d) | — | 22.1 |
| Condition: ε; k; τ falling; τ rising | 0.20; 1; 0.35 SD; 0.70 SD | ε 0–0.30 | 22.2 |
| Starvation hazard | 4(\[0.35 − c\]₊/0.35)² per SD | — | 22.2 |
| Wounds: new injury; healing | 0.20 + 0.40U; −min(n, 1)/2 per SD | — | 22.3 |
| Age hazard | \[0.003 + 0.008 e^((y − 50)/10)\]/12 per SD | — | 22.4 |
| Pregnancy-loss hazard | 0.30(\[0.6 − c\]₊/0.6)² per SD | — | 22.4 |
| Fatigue: base; load; scale; τ up / down; penalties | 0.30; 0.12; 0.20; 1 / 0.5 SD; 0.20 physical, 0.15 coordination, 0.10 craft | Base 0.25–0.40; physical 0.10–0.30 | 22.5 |
| Enjoyment: restoration; decay ρ; pleasant saturation | 1.5 per SD; 0.08 + 0.12q; u₊ = 0.12 | Restoration 0.5–3 | 22.6 |
| Family base weights w\_F | Leisure 1; social 1; romantic 0.7; exploration 0.3; play 1 | Exploration 0–0.6 | 22.6 |
| Family unfamiliarity sensitivity κ\_F | Leisure 0.2; social 0.2; romantic 0; exploration 1.5; play 0.5 | Exploration 0–3 | 22.6 |
| Satiation κ\_sat; τ\_sat | 0.5; 3 SD | κ\_sat 0–1 | 22.6 |
| Familiarity half-count; decay | 3 exposures; τ 36 SD | — | 22.6 |
| Frustration prior count; decay | 2; τ 24 SD | — | 22.6 |
| Genetics: SDs q, δ, e, v; δ correlation | 0.25, 0.25, 0.60, 0.40; −0.20 | Advanced | 23.1 |
| Mutation: probability; increments q/δ/v, e; markers | 0.02; 0.08, 0.15; 0.05 rad | Advanced | 23.1 |
| Development: weights; switch age; realisation | Phys 2→1, mental 1→2 at 72 SD; 0.40 + 0.60D (B, A), 0.30 + 0.70D (C, P) | — | 23.2 |
| Nutrition target; care curve; care quality | 1 + 0.60 sat(·); 0.24/0.16/0.08/0.025/0 at 0/2/6/12/18 y; §23.3 | Care burden 0.6–1.5× | 23.3 |
| Exposure exponents | E\_phys N^0.65 C^0.25 S^0.10; E\_mental N^0.35 C^0.45 X^0.20 | — | 23.3 |
| Competence weights; normalisation | §24.1; 0.12 + 0.88x, /0.56 | — | 24.1 |
| Learning constant; failure share; transfer coefficient | 12 SD; 0.75; 0.30 with §24.2 entries | 6–24 SD | 24.2 |
| Mentorship gain; teaching cost; observation share | 1.5; 0.15 mentor work-SD per learner practice-SD; ≤ 0.15 | — | 24.2 |
| Plasticity; play effectiveness | 0.5; η 0.5–0.6 per §24.6 | 0–0.75 | 24.2 |
| Task expression | §24.3 table; d\_sex = 1 | d\_sex 0–1.4; F command ratio 0.45–0.85 | 24.3 |
| Juvenile participation exponent; supervision | 0.8; 0.10 clip((14 − a)/4, 0, 1) | 0.6–1.2 | 24.5 |
| Trial yield factor `S.trial.yieldFactor` | 0.5 | 0.3–1 | 13.5 |
| Provisional method output factor χ\_method | 0.7 + 0.3 κ\_m | — | 24.4 |
| Relative gain priors ĝ\_φ | T1 0.20; T2 0.10; T3 0.10; T6 0.25; T7 0.20; T8 0.20 | 0–0.5 | 13.4 |
| `S.culture.teachTime` | 0.25 SD joint time per method | 0.1–0.5 | 24.7 |
| Taught confidence | κ = clip(0.2 + 0.4 sat(K\_teacher) + 0.2 sat(X\_C,learner), 0.2, 0.8); parameter fidelity noise log SD 0.25/(1 + K\_teacher) | — | 24.7 |
| `S.culture.confirmRate` | 0.6 | 0.4–0.8 | 24.7 |
| Method lapse | Unused provisional method with κ < 0.5 lapses after 48 SD unused | 24–∞ | 13.7 |
| Report-based hypothesis fidelity | Parameter noise log SD 0.5 / reliability | — | 24.7 |

#### 47.3 Scientific parameters: preferences, social life and power (class S)

| Parameter | Baseline | Exploration range | § |
| --- | --- | --- | --- |
| β\_R; β\_D; β\_f; β\_b | 1.5; 0.50; 0.8; 0.15 | 0–4; 0–1; 0–2; 0–0.4 | 12.5 |
| Dispositions; discount; relational weight | Uniform \[−1, 1\], immutable, not heritable; τ = 24 × 2^p SD; ω = 1 + 0.5 aT | Median 12–60 SD | 10.2 |
| Severe-risk ceiling | p₃ = 0.12 + 0.06 rT over 3 SD | — | 12.7 |
| Ties: τ\_rel; saturation; social yield; response decay | 36 SD; /3; 0.4 per work-SD; 12 SD | — | 25 |
| New-person capability prior | K = 1, log SD 0.7 | — | 25.3 |
| Report reliability counts | Decay τ 12 SD; unknown 0.5 | — | 11.4 |
| Observation noise | Log SD 0.35 / max(0.25, √(X\_C K)) | — | 11.4 |
| `S.social.recurringPeriod` | 3 SD | 2–6 | 26.6 |
| Insurance target; draw limit | 2 quiet-food SD; 0.5 SD | — | 28.2 |
| Complementarity θ, γ | §28.3 table | γ scale 0–1.5 | 28.3 |
| Coordination: coefficient; exponent; χ; staleness; crowding | 0.025; 1.3; 1.5; 3 SD; 0.15 | 0.015–0.05 | 28.4 |
| Household trial; establishment | 3 SD and two service SD; 6 SD and 0.60 over two periods | 6–12 SD | 29.1 |
| Continuity inertia | Amplitude 4, τ 12 SD, (0.4 + 0.6b), 0.20, 0.15 | 2–6; 6–24 SD | 29.2 |
| History friction | χ 1 / 0.35 / 0.50; exponent 1.5; coefficient 0.80 | 1.2–1.8; 0.4–1.2 | 29.2 |
| Transition floor; M exit share | 0.05; 0.35 | — | 29.2 |
| Provisioning split; feeding tiers | 0.60 / 0.40; {1, 1.15, 1.30, 1.50} | — | 29.3 |
| Optional support cap; recipient scaling | min(surplus, 3 B̂\_quiet) per 3 SD; 0.10 + 0.90 A² | — | 29.4 |
| Attraction coefficients | §30.2 | Success coefficient 0–0.80 | 30.2 |
| π: decay; event scale | 24 SD; v/4 with 4 B̂\_quiet SD normaliser | — | 30.3 |
| Kin bands; κ; search depths | g = 0.075 / 0.25 / 0.50 / 1; 1; 3 shared, 6 direct | κ 0–1.5 | 30.4 |
| Readiness: k\_A; k\_B; μ; freshness; thresholds; residual | 6/SD; 0.18/SD; 0.05/SD; 4 SD; 0.65 accept, 0.85 initiate; 0.05 | 2–12; 0.06–0.40; 0.02–0.15 | 30.5 |
| Encounter satiation F; M | τ 2 SD, κ 0.50; τ 0.75 SD, κ 0.20 | — | 30.6 |
| Pair cooldown; encounter duration | 0.75 SD; 0.03 SD | 0.5–1 | 30.6–30.7 |
| Willingness | W = r + 0.20 νq/(q + Q\_F) − K\_disrupt; r ≥ 0.35; T ≥ 0.65; K\_disrupt ≤ 0.20; up to 3 alternatives | — | 30.7 |
| Novel-partner cost | 1.25 n²/(9 + n²), n = prior distinct partners | Limit 0.8–1.4 | 30.7 |
| Conception ceiling; window; sire decay | 0.25; 1 SD; 0.5 SD | 0.10–0.40 | 31.1 |
| Fertility curves | §31.1 table | — | 31.1 |
| Gestation; recognition delay | U\[8.5, 9.5\] SD; U\[1.5, 2.5\] SD | — | 31.2 |
| Hard recovery; return τ; loss recovery | 3 SD; 3 SD; 0.5 SD | 2–4; 2–5 (diagnostic 12, 24) | 31.2 |
| Office template | 12 SD, 3 periods, 3 counterparties, 2 units, 60% of delivered volume | — | 35.2 |
| Formal coercive-office restriction | Off | Explicit fallback experiment only | 35.5 |
| `S.inst.handoverRate` | 0.02 SD per transferred record item, minimum 0.05 SD | 0.01–0.05 | 34.4 |
| Influence overlay | Arrival ≤ 0.5 SD; 3 km scale; 25% lead | Display only | 36.3 |
| Contest | σ\[2 ln(F\_A/F\_B)\]; 0.04 SD reference engagement | — | 37.2 |
| Injury; loser factor; protection; fatality | 0.50; 1.5; 0.50 Q d; clip(0.05 + 0.30 w, 0, 1) | — | 37.2 |
| Outpost factor; loading; occupation; secession window | 1 + 0.4 × integrity; ≥ 0.03 SD; 1 SD; 12 SD | — | 37.3 |
| Coalition label | 3 adults, 2 units, 2 recurring periods | — | 27.5 |

#### 47.4 Causal policy parameters (class P, provisional)

| Name | Baseline | Purpose |
| --- | --- | --- |
| `P.attn.reviewEpoch` | 2 SD, staggered by key | Periodic reconsideration |
| `P.attn.reviewCap` | 8 discretionary reviews per person per SD | Bounds review frequency |
| `P.attn.urgentDrives` | 2 | Agenda: urgent drives |
| `P.attn.offers` | 3 | Agenda: proposal versions and recipients considered |
| `P.attn.descriptors` | 24 | Cheap pre-estimates per review |
| `P.attn.fullComparisons` | 6, including the reference | Full binding and forecasting |
| `P.effort.review` | 600 EU | Total cognitive work per review |
| `P.effort.safety` | 80 EU | Safety branch |
| `P.effort.repair` | 40 EU | Runtime repair allowance |
| `P.plan.nodesPerReview` | 16 | Frontier expansions per review |
| `P.plan.activeNodes` | 12 per project | Active frontier |
| `P.plan.altsPerNode` | 2 | Alternatives per unresolved node |
| `P.plan.storedBranches` | 6 per project | Stored optional branches |
| `P.plan.retainedProjects` | 3 per person | Retained projects |
| `P.plan.renewalInterval` | 6 SD, coalesced into reviews | Strategic re-evaluation |
| `P.forecast.horizons` | 3 / 12 / 60 SD (routine / investment and recurring / strategic) | Explicit horizons before completion tails |
| `P.choice.incumbentMargin` | 0.05 utility | Stability |
| `P.choice.heldErrorScale` | 0.05 utility per forecast-SD | Fallibility |
| `P.wake.salience` | 0.05 utility | Evidence that wakes a mind |
| `P.wake.thresholds` | Food: fire below 0.25 SD of need, re-arm above 0.5 SD; rest: fire d ≥ 0.5, re-arm d ≤ 0.35; dependants: fire below coverage 1, re-arm after one closure at 1; readiness: fire at threshold, re-arm 0.05 below | Edge-triggered wakes |
| `P.trial.unfamiliarity` | Familiarity below 0.5 | Trial source eligibility |
| `P.trial.candidatesPerReview` | 2 | Trial construction |
| `P.trial.outcomePrior` | Beta(1, 4) | Cultural trial-outcome prior |
| `P.trial.generalisation` | 0.25 | Spill to the broader cell |
| `P.trial.anomalyThreshold` | Outcome beyond 2 predicted SD, or an unpredicted property | Anomaly flag |
| `P.inquiry.outcomeClasses` | 3 (absent, poor, useful) | Bounded information value |
| `P.prior.strengthArea` | 1 km² equivalent per terrain class | Occupancy prior weight |
| `P.prior.contactResponse` | Beta(1, 3) | Social response prior |
| `P.belief.volatility` | Log-stock variance growth: fast 0.10 per SD; slow 0.02 per SD; fixed 0 | Reopening dynamic beliefs |
| `P.aspire.max`; `P.aspire.decay` | 3; τ 24 SD | Aspirations |
| `P.mem.places`; `P.mem.ties`; `P.mem.attempts` | 32; 40; 48 | Discretionary memory |
| `P.mem.routineObservations` | 12 per SD | Perception attention |
| `P.mem.reportLifetime`; `P.mem.incidentLifetime` | 3 SD; 6 SD | Report freshness |
| `P.culture.trialConfidence` | 0.4 | Confidence of a trial-acquired method |
| `P.env.defaults` | Substitutions within the same method family, target class, counterparty and rights basis; quantity ±25%; time estimate + 25%; spending estimate + 10%; exposure at the severe-risk ceiling | Envelope defaults |
| `P.env.reserve` | 0.5 SD of estimated quiet requirement at the return point | Reserve rule |
| `P.env.optionalCeiling` | 0.25 SD of time and 1 SD of quiet food per authorization | Optional envelopes |
| `P.social.leaseExpiry` | 0.5 SD local; estimated round trip + 0.5 SD distributed, at most 3 SD | Provisional leases |
| `P.social.bargaining` | Open at 0.5 of estimated ceiling; one counteroffer | Bargaining convention |
| `P.social.pledgeRounds` | 3 | Pledge stabilisation |
| `P.social.contactsPerProposal` | 8 | Group, office and campaign proposals |
| `P.social.extractionMenu` | {0, 0.70, 0.90, 1, 1.05} × requested need, or the requested amount; one interpolation | Labour and remittance terms |

#### 47.5 Numerical semantics (class N)

| Name | Baseline |
| --- | --- |
| `N.time.quantum` | 2⁻²⁰ SD |
| Representative closure offset | (semantic key mod 2²⁰)/2²⁰ SD |
| `N.num.rootTolerance`; `N.num.rootMaxIter` | 2⁻³⁰ SD; 64 iterations |
| `N.forecast.blocks` | 6 base blocks plus up to 4 inserted boundaries |
| `N.effort.unitCosts` (EU) | Descriptor 1; retrieval 1 per candidate; node expansion 4; trial candidate 3; forecast 1 per block per option; information class 1 per block; counterparty 2; route 1 per 64 cell expansions |
| `N.wake.signatureQuanta` | Condition 0.05; food 0.05 SD; fatigue 0.05; utility 0.01 |
| `N.content.maxPredicateNodes`; `N.content.maxMethodSteps` | 32; 12 |
| Sampler transforms and reduction order | As recorded in the certified numerical profile |
| Fertility phase quantum | 1 … 2²⁰ − 1, divided by 2²⁰ |

#### 47.6 Founding culture, priors and founder-unknown schemas

- **Founding repertoire (established, κ = 1):** gather; wood; stone; fibre; hunt ordinary prey; carcass processing; fishing with a compatible tool; work tool; weapon; protection; cache; store; workshop; outpost; repair; practice; contact, propose and exchange templates.
- **Cultural priors:** habitable-terrain food-site density 0.12/km²; raw-material-site density 0.04/km²; terrain danger prior 0.01 per exposed SD in forest and scrub, 0.005 elsewhere (danger may be disabled in safe proof worlds); newly known stock prior centred at half capacity; ordinary capability prior K = 1.
- **Compatibility table (public model knowledge):** strike and knap ↔ hard or glassy; twist and weave ↔ fibrous; dry, smoke and process ↔ edible; cut and scrape ↔ soft; dig ↔ loose ground. It declares what may be tried, never what results.
- **Material kinds:** two of the six canonical stone deposits are of the glassy kind (perceptible: glassy, hard; trial-revealed: flakes to an edge).
- **Founder-unknown schemas:**

| Schema | Trigger signature | Outcome |
| --- | --- | --- |
| Edge-flaking | Strike (Work) on glassy stone with any stone held as hammer | 1 edged flake per stone unit, 0.03 work-SD; a work tool or weapon made with an edged flake as its stone input gains ΔQ\_input = +0.25 |
| Drying | Process food at a cache or store with 0.2 soft material per 4 FU | 0.05 work-SD per 4 FU; dried food spoils at 0.15 carried and 0.08 cached per SD |
| Fibre net | Twist and weave 3 fibre | 0.12 work-SD; a net item compatible with fishing; fishing output × 1.30 |

#### 47.7 Engineering parameters (class E)

Truth-side region size target 2–4 km; spatial hash cell about the sight radius; decision-trace window of recent reviews per person plus aggregates; rolling checkpoints every 12 SD at committed boundaries plus explicit saves; snapshot publication at causal events throttled to display rate; default playback 15 real seconds per SD at 1×. A change to any of these that alters the causal digest reclassifies it.

#### 47.8 Disable semantics

ε = 0 removes enhancement terms without division by zero; γ = 0 removes complementarity but not logistics; k\_B = 0 keeps b, h and food; success coefficient 0 keeps observed production and contact; β\_f = 0 removes the value of leisure but keeps its real consequences; β\_R = 0 removes encounter utility, not biology; exploration weight 0 with all κ\_F = 0 removes non-instrumental exploration; κ\_sat = 0 restores satiation-free enjoyment; danger 0 removes predation; return τ = 0 gives immediate post-birth return; mentorship gain 0 removes teaching acceleration but not method transmission. No setting creates a population stabiliser.

#### 47.9 Named variants

Wrong-prior; no-curiosity (exploration weight and κ\_F zero); satiation-off; success-attraction-off; display-off; complementarity-off; encounter-value-zero; extra-pair-restricted (an explicitly altered eligibility rule); novel-partner-off; household-cardinality-symmetric; return-τ sweeps; founder-familiarity prehistory; scarce, frontier, long-journey and production-rich ecologies; coercive-office restriction (fallback experiment only, §35.5).

### 48. Scientific hypotheses and provisional items \[V–VI\]

**The architecture is resolved; what remains open is empirical. Every provisional value below is fully specified in §47 so runs are reproducible, and each names how it will be tested.** None is a finding, and none is an unresolved architectural question.

#### 48.1 Hypotheses under test

- Whether the declared preferences, ecology and biology produce the intended reproductive regime at all (§1.2, §38.3), and whether the high-sire tail is enriched for prior competitive success rather than display alone.
- Whether display selection outruns capability selection, and how inherited factors drift.
- Whether the M-centred coercive regime arises from task expression, combat and recruitment alone.
- Whether the canonical map's carrying capacity sits inside the operating range.
- Whether the post-birth return setting produces plausible spacing, given contact, food and care.
- Whether bounded trials, process value and transmission produce cumulative cultural repertoire, stable loss, or neither, across ecologies.
- Whether institutions persist across holder turnover and distance, and when they fragment.

A negative answer to any of these is a scientific result, reported as such.

#### 48.2 Provisional choices and how they are resolved

| Choice | Baseline | Resolved by |
| --- | --- | --- |
| Process-value constants (exploration weight, κ\_F, κ\_sat, familiarity, frustration) | §47.2 | P1 comfortable-inquiry and P3 cases; directional trial tests; wandering and stagnation falsifiers across seeds; no-curiosity and satiation-off variants |
| Trial-outcome prior, relative-gain priors, trial yield factor | §47.2, §47.4 | P3 positive and negative cases; natural discovery rates in Stage II panels, reported, never targeted |
| Effort budget and agenda sizes | §47.4 | P5 irrelevant-content and P6 cost probes; budget sensitivity (§44.2) |
| Review epoch and wake thresholds | §47.4 | Starvation-with-known-food incidence and wake counters in proof traces |
| Occupancy prior strength and volatility rates | §47.4 | Directional inquiry tests; wrong-prior variant |
| Forecast blocks and horizons with completion tails | §47.4–§47.5 | Forecast accuracy against realised outcomes in analyst traces; P2 beyond-horizon case |
| Teaching confidence, fidelity and handover rate | §47.2–§47.3 | Stage II diffusion panels; P4 taught-method case; P4b lifecycle |
| Raster resolution and region construction at 400 people | §47.2, §47.7 | P6 and Stage IV cost probes |
| Whether inference capacity should also widen effort budgets | Noise only | Only if a scientific question requires it, as a declared mechanism |

#### 48.3 Declared extensions outside the baseline

Each is optional science, added later as a micro increment with its own law, fixture, negative case and experiment label (§42.7); none is required by the baseline experiment and none requires a new mind:

- norm and rule change other than unanimous re-acceptance;
- writing and located records; vehicles; money and credit;
- disease and inbreeding depression;
- mate guarding, fidelity-conditioned support, jealousy and their enforcement;
- religious credence as a belief and preference law;
- familiarity within groups as a coordination effect;
- contested person-status institutions, only as a separately named experiment;
- richer material and invention laws that enlarge the possibility space beyond the implemented schemas;
- coercive-office sex restriction, as a fallback experiment only (§35.5).

### 49. Compact architecture summary \[III\]

**ESS is one fixed substrate, a library of typed causal laws, a growing body of declarative content, and learned and institutional records that accumulate as history unfolds. Every person runs the same mind; every activity runs on the same authorised task runtime; every arrangement runs through the same social protocol; every fact a person knows arrives as evidence.**

#### 49.1 The substrate in fourteen lines

1. **Kernel:** integer event time, phased heap, semantic lineage keys, keyed randomness, anchored laws, continuation-sufficient checkpoints, compact history, decision trace.
2. **Space:** continuous positions over a weighted raster; truth-side regions for execution; personal geography and region summaries for planning; swept perception.
3. **Goods:** one ledger of located containers, quantities, items, custody, claims, debts and leases, with typed transaction kinds including contested taking; conservation always checked.
4. **Transformations:** one schema for extraction, making, building, repair, practice and trials, resolved by the material-effects law; work-in-progress lives in the world.
5. **Evidence:** dated, attributed estimates with detection-qualified absence, occupancy inference, contextual outcomes, durable precedent, and end-to-end isolation from hidden truth.
6. **Repertoire:** personal methods, properties, heuristics and norms with provenance and confidence, learned through trials, demonstration, teaching and records.
7. **Drives and aspirations:** state-derived urgencies and revisable desired services that supply initiative.
8. **Arbitration:** one arbiter applying feasibility gates, assent constraints, commitment semantics and severe-risk policy, then aggregating typed consequences with an incumbent margin and held error.
9. **Exploration:** a typed trial grammar over perceived properties and known operations; bounded information value; process value under one enjoyment law; actor-relative novelty decided by world law.
10. **Projects:** persistent bounded frontiers with typed prerequisite states, fair method admission and completion tails; no lifetime depth ceiling.
11. **Runtime:** six operation families under authorization envelopes; continue, repair within the envelope, or escalate.
12. **Effort account:** one instrumented budget per review shared by all nested work; indexed retrieval; coalesced, edge-triggered wakes; deferral, never impossibility.
13. **Social protocol:** versioned proposals, independent responses, leases, atomic or communicated commits, obligations that outlive tasks, distinct origins of social meaning, and institution records that persist without a mind.
14. **Presentation:** snapshot projections and interpolation; observer, selected-person and analyst views; inert.

#### 49.2 The laws

Physiology (requirement, condition, starvation, wounds, ageing, fatigue, enjoyment and process value); genetics and development; learning, task expression and method transmission; ecology, animals and material effects; spoilage and cargo; quality and wear; perception and detection; coupled work and coordination; attraction, readiness, satiation and kin suppression; fertility, conception, pregnancy, loss, birth and post-birth return; recognition; care responsibility; household bond; estates; patronage; office, delegation and succession; contest, injury and occupation; message transmission; regional influence (display).

#### 49.3 The content and the records

**Content:** goods, material kinds and properties, method schemas with trigger signatures, recipes, item effects, trial forms and the compatibility table, resource kinds and renewal, terrain classes and cultural priors, task-expression tables, relation templates, obligation kinds, roles, procedures, rule sets, office templates, scenarios and the founding culture. **Records created by history:** repertoires, attempt and precedent summaries, projects, commitments and obligations, recognitions, institution records and adopted procedure versions.

#### 49.4 The rules that keep it small

- No content-identity branches in control; domain knowledge yes, domain controllers no.
- No law selects anyone's purposes or commitments.
- One persistence mechanism, one arbiter over typed consequences, one information boundary, one authorization boundary, one effort account.
- Generalise process; preserve causal meaning.
- New capability lands in content first, narrow laws second, general services only by decision record.
- Diagnose before patching; never tune toward outcomes; never let deferral become impossibility.

#### 49.5 The path

Build and falsify the whole substrate in Stage I through the six proof dimensions, adopting it at the Adoption Gate. Add the cooperative band (Stage II), the life course (Stage III) and power, institutions and territory (Stage IV) as waves of laws and content over that substrate, each with a watchable world and a stage gate. Then run the canonical experiment across seeds and generations, adding later science as micro increments, and judge the project by whether success-coupled reproductive inequality, cultural accumulation and genetic change emerge, fail, or vary across worlds.

## Appendix A — Historical crosswalk \[VII, non-normative\]

**This appendix records how earlier implementation structure maps onto Revision 4.0. Nothing in it is a requirement, and its layer numbers carry no authority.** The L0–L42 sequence was designed when each new capability tended to need new behavioural machinery; it is retired as a roadmap and kept only to confirm that no mature capability has been omitted and to preserve lessons about causal dependency.

#### A.1 Lineage

- **V1** implemented much of the scientific model (genetics, development, a physical goods ledger, encounters, conception, separate fatherhood, paid care, households, cooperative hunting) with a worker-and-renderer split. Its decisions lived in a large survival planner with per-recipe callbacks, and immutable data structures made cost grow with history.
- **V2** restarted on Revision 3.2 with a 43-layer build sequence and implemented L0–L10. Its behaviour was competent in short probes, but each capability had grown its own controller, tried in a fixed order, with separate persistence and funding records, a dedicated exploration subsystem and a single hard-coded recipe.
- **Revision 4.0** keeps the scientific model and replaces the control architecture with one substrate, as specified in this document.

#### A.2 Crosswalk

| Former layers | Capability | Revision 4.0 home | Kind |
| --- | --- | --- | --- |
| L0–L10 | Kernel, foundation, food, rest, exploration, cargo, caches, wood, stone, tool, learning, simple danger | Stage I (I.1) | Substrate plus founding laws and content |
| L11 | Production depth: fishing, fibre, repair, weapons, protection, stores, workshops, predators | Stage II; fishing chain also in P2 | Content and engagement law |
| L12–L16 | Contact, proposals and commitments, exchange, joint hunts, reciprocal watch, recurring parties | Protocol in Stage I (I.2); uses in Stage II | Substrate, then content and narrow laws |
| L17–L19 | Shared stores and custodians, workshop mentorship, reports and messengers | Stage II | First institution-record consumers; channel law |
| L20–L28 | Care, households, attraction and readiness, encounters, conception, pregnancy, birth, recognition, childhood, death and estates | Stage III | New law family |
| L29–L33 | Pooled goods, patronage, defence, control of anchors and access, delegation | Stage IV (IV.1) | Laws and procedures over institution records |
| L34–L39 | Standing offices, remittance, raids, occupation, coalitions and secession, succession | Stage IV (IV.2); coalition label in Stage II | Laws and scale |
| L40 | Strategic projects | Stage I (persistent projects are substrate) | Substrate |
| L41–L42 | Canonical 96-founder world; long-run selection experiments | Experimental programme | Experiment |

#### A.3 Lessons preserved

Causal dependency order survives: material life before exchange, exchange before households, households before inherited power, power before territory. What does not survive is the assumption that each step needs new intelligence: in Revision 4.0 the general machinery is built once, early, and later steps add laws, content and scale.
