import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import type { GraphQlQueryResponseData } from '@octokit/graphql'
import { log } from 'console'

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('github-token')
    const close_count = parseInt(core.getInput('close-count'))
    log(`Closing ${close_count} issues`)
    log('token: ' + accessToken)
    const prNumber = context.payload.pull_request?.number
    const owner = context.payload.repository?.owner.login!
    const name = context.payload.repository?.name!
    if (!prNumber) {
      core.setFailed('No PR number found')
      return
    }

    const client = getOctokit(accessToken)

    const { repository } = await client.graphql<GraphQlQueryResponseData>(
      `{
        repository(owner: "SULAPIS", name: "tagtest") {
          pullRequest(number: 46) {
            closingIssuesReferences(first: 5) {
              nodes {
                number
              }
            }
          }
        }
      }`
      // owner: owner,
      // name: name,
      // number: prNumber,
      // first: close_count
    )
    log(JSON.stringify(repository))
    const closingIssues = repository.pullRequest.closingIssuesReferences.nodes

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
