import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import type { GraphQlQueryResponseData } from '@octokit/graphql'

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('github-token')
    const close_count = parseInt(core.getInput('close-count'))
    const prNumber = context.payload.pull_request?.number
    const owner = context.payload.repository?.owner.login!
    const name = context.payload.repository?.name!
    if (!prNumber) {
      core.setFailed('No PR number found')
      return
    }

    const client = getOctokit(accessToken)

    const { repository } = await client.graphql<GraphQlQueryResponseData>({
      query: `query closingIssues($owner: String!, $name: String!, $number: Int!, $first: Int) {
        repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
                closingIssuesReferences(first: $first) {
                    nodes {
                        number
                    }
                }
            }
        }
      }`,
      owner: owner,
      name: name,
      number: prNumber,
      first: close_count
    })

    const closingIssues = repository.pullRequest.closingIssuesReferences.nodes

    for (const issue of closingIssues) {
      const issueNumber: number = issue.number
      await client.rest.issues.update({
        owner,
        repo: name,
        issue_number: issueNumber,
        state: 'closed'
      })
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
