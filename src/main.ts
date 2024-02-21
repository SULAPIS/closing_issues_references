import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import type { GraphQlQueryResponseData } from "@octokit/graphql";

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('access-token');
    const close_count = parseInt(core.getInput('close_count'));
    const prNumber = context.payload.pull_request?.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    if (!prNumber) {
      core.setFailed('No PR number found');
      return;
    }

    const client = getOctokit(accessToken);

    const result = await client.graphql<GraphQlQueryResponseData>(
      `{
        repository(owner: "${owner}", name: "${repo}") {
            pullRequest(number: ${prNumber}) {
                closingIssuesReferences(first: ${close_count}) {
                    nodes {
                        number
                    }
                }
            }
        }
      }
      `
    );
    const closingIssues = result.repository.pullRequest.closingIssuesReferences.nodes;

    for (const issue of closingIssues) {
      const issueNumber: number = issue.number;
      await client.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed'
      });
    }

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
