import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import type { GraphQlQueryResponseData } from '@octokit/graphql'
import { log } from 'console'

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('github-token')
    const close_count = parseInt(core.getInput('close_count'))
    const prNumber = context.payload.pull_request?.number
    const owner = context.payload.repository?.owner.login!
    const name = context.payload.repository?.name!
    if (!prNumber) {
      core.setFailed('No PR number found')
      return
    }

    const client = getOctokit(accessToken)

    const result = await client.graphql<GraphQlQueryResponseData>({
      query: `
        query repository($owner: String!, name: String!) {
            pullRequest($number: Int!) {
                closingIssuesReferences($first: Int!) {
                    nodes {
                        number
                    }
                }
            }
        }
      `,
      owner: owner,
      name: name,
      number: prNumber,
      first: close_count,
      headers: {
        authorization: `token ${accessToken}`
      }
    })
    log(JSON.stringify(result))
    const closingIssues =
      result.repository.pullRequest.closingIssuesReferences.nodes

    for (const issue of closingIssues) {
      const issueNumber: number = issue.number
      log(`Closing issue ${issueNumber}`)
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
