# COUNCIL -- Full Project Context Documentation

## Overview

This document captures the complete context of the COUNCIL project
discussion, including: - Problem Statement - Solution Overview - AWS
Architecture Decisions - GenAI Model Selection - Data Strategy - 24-Hour
Goal - Prototype Stack Selection - Serverless Architecture Design - UI
References

------------------------------------------------------------------------

# 1. Problem Statement

Modern AI content tools follow a linear **Prompt → Response** workflow.\
They generate content quickly but lack structured critique, strategic
diversity, and transparent reasoning.

Content creators suffer from: - Perspective blindness - Lack of
real-time multi-stakeholder feedback - Over-reliance on single-draft AI
outputs - Black-box reasoning

The challenge is to build a GenAI system that: - Introduces structured
internal debate - Simulates real-world stakeholder perspectives -
Provides multiple strategic directions - Makes reasoning transparent

------------------------------------------------------------------------

# 2. Proposed Solution -- COUNCIL

COUNCIL is a **multi-agent AI editorial boardroom**.

Instead of one AI responding directly, multiple AI personas debate
before generating the final draft.

## Workflow

### Phase 1: Debate (Divergence)

Three agents: - Hype-Man (Virality & hooks) - Professor (Technical
accuracy & depth) - Skeptic (Logic gaps & credibility)

Agents debate in real time.

### Phase 2: Mediation (Convergence)

A Mediator agent synthesizes the debate and produces: - Path A --
Aggressive Launch - Path B -- Technical Deep Dive - Path C -- Balanced
Narrative

User selects strategy.

### Phase 3: Execution (Synthesis)

Final content is generated with annotations explaining reasoning.

------------------------------------------------------------------------

# 3. AWS Architecture Stack (MVP)

## Required Services

-   Amazon Bedrock
-   AWS Lambda
-   Amazon S3
-   (Optional) Amazon DynamoDB
-   Amazon API Gateway
-   Amazon CloudWatch

## Why Serverless?

Fully serverless architecture: - No EC2 - No container management - Auto
scaling - Pay-per-use model - Rapid hackathon deployment

------------------------------------------------------------------------

# 4. GenAI Model Strategy

Primary Model: - Claude 3.5 Sonnet (via Amazon Bedrock)

Secondary Model: - Meta Llama 3 70B Instruct (via Bedrock)

Agent Assignment: - Hype-Man → Llama 3 - Professor → Claude - Skeptic →
Claude - Mediator → Claude (primary reasoning)

------------------------------------------------------------------------

# 5. Data Strategy

## Data Sources

-   User prompts
-   Agent debate transcripts
-   Strategic path selections
-   Annotated final drafts

## Storage Plan

  Data Type          Service
  ------------------ ------------
  Raw prompts        S3
  Debate logs        S3
  Session metadata   DynamoDB
  Logs               CloudWatch

------------------------------------------------------------------------

# 6. 24-Hour Goal

Deploy a functional prototype that: - Accepts prompt - Runs 3-agent
debate via Bedrock - Generates 3 strategic paths - Stores logs in S3 -
Returns structured JSON response

------------------------------------------------------------------------

# 7. First Technical Milestone

Successfully: - Invoke Claude via Bedrock - From AWS Lambda - Store
response in S3

This validates IAM, Bedrock access, Lambda orchestration, and storage
integration.

------------------------------------------------------------------------

# 8. Prototype Architecture Flow

User → API Gateway → Lambda → Bedrock → S3/DynamoDB → Response

------------------------------------------------------------------------

# 9. Raw Architecture Prompt

Design a serverless, multi-agent GenAI content platform called "COUNCIL"
on AWS that:

-   Accepts user prompt
-   Uses API Gateway
-   Invokes Lambda
-   Calls Bedrock models
-   Runs 3 agents in parallel
-   Stores debate logs in S3
-   Stores session metadata in DynamoDB
-   Uses Mediator agent to generate 3 strategic paths
-   Returns structured JSON
-   Displays real-time debate in frontend
-   Uses CloudWatch for logging

------------------------------------------------------------------------

# 10. UI References

Recommended inspiration:

-   Perplexity.ai (clean AI chat UI)
-   Linear.app (modern SaaS cards & layout)
-   Notion AI (annotated content style)
-   ChatGPT (streaming response UX)

Recommended design stack: - Next.js - React 18 - Tailwind CSS - ShadCN
UI - Framer Motion - Inter font - Dark mode default

------------------------------------------------------------------------

# 11. Final Vision

COUNCIL transforms AI content generation from:

Prompt → Response

to

Prompt → Debate → Choice → Response

The user becomes a **Director**, not just a Prompter.

This creates: - Strategically validated content - Multi-perspective
robustness - Transparent reasoning - Higher publishing confidence

------------------------------------------------------------------------

End of Document
