#!/usr/bin/env bash
set -eu
# Queensland Health form, fetched from its public page rather than copied into this repo.
curl -sSfL -o appointment-attendance-form-c.pdf "https://www.qld.gov.au/__data/assets/pdf_file/0014/93011/appointment-attendance-form-c.pdf"
