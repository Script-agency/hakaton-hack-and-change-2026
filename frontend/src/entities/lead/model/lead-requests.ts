let activeRequest: AbortController | undefined;

export const beginLeadRequest = () => {
  if (activeRequest !== undefined && !activeRequest.signal.aborted) {
    return undefined;
  }

  activeRequest = new AbortController();

  return activeRequest;
};

export const finishLeadRequest = (controller: AbortController) => {
  if (activeRequest === controller) {
    activeRequest = undefined;
  }
};

export const resetLeadState = () => {
  activeRequest?.abort();
  activeRequest = undefined;
};
