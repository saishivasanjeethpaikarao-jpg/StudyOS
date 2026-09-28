# Upstream Provenance

StudyOS currently inherits its application foundation from [Open Sunsama](https://github.com/ShadowWalker2014/open-sunsama). The audited and pinned foundation commit for the StudyOS migration baseline is:

```text
fecaf22e9391c6c5ff0ccfed01892b98aa20a45d
```

Internal `@open-sunsama/*` package names, existing database tables, API routes and the baseline migration are intentionally retained during the incremental migration.

## Hermes Agent

[NousResearch/Hermes Agent](https://github.com/NousResearch/hermes-agent) is maintained as a separate sibling checkout at `D:\StudyOS-Project\hermes-agent`. It is an optional external agent runtime and is not vendored into the StudyOS repository. The commit used for the Phase 0 integration audit is:

```text
a0fe806c46e729894c60e5dd25154400d179b231
```

Normal StudyOS operation and development must not depend on Hermes being installed or online.

## Licensing

Keep all existing license and attribution files intact. The inherited Open Sunsama license contains non-commercial restrictions. This provenance record does not grant or claim redistribution, commercial-use or sublicensing rights. Applicable upstream obligations and distribution rights must be reviewed before any public or commercial StudyOS release.
