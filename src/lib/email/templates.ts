import { env } from "@/lib/env";

function escapeHtml(value: string) {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(/[&<>"']/g, (char) => replacements[char]);
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f3ed;color:#19231d;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #ddd6c8;border-radius:12px;padding:28px;">
        <p style="margin:0 0 18px;color:#47604e;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Huntfields</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;color:#19231d;">${title}</h1>
        <div style="font-size:16px;line-height:1.6;color:#344239;">${body}</div>
      </div>
      <p style="margin:18px 0 0;color:#6f756f;font-size:12px;">This email was sent by Huntfields transactional notifications.</p>
    </div>
  </body>
</html>`;
}

function button(label: string, href: string) {
  return `<p style="margin:24px 0 0;"><a href="${href}" style="display:inline-block;background:#234331;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 16px;font-weight:700;">${label}</a></p>`;
}

export const emailTemplates = {
  signupConfirmation(email: string, confirmationUrl: string) {
    return {
      subject: "Confirm your Huntfields account",
      text: `Confirm ${email} for Huntfields: ${confirmationUrl}`,
      html: layout(
        "Confirm your Huntfields account",
        `<p>Confirm ${email} to start messaging landowners and managing land listings.</p>${button("Confirm account", confirmationUrl)}`,
      ),
    };
  },
  listingSubmitted(title: string, listingUrl: string) {
    return {
      subject: `New listing submitted: ${title}`,
      text: `A new listing was submitted for review: ${title}\n${listingUrl}`,
      html: layout(
        "New listing submitted",
        `<p><strong>${title}</strong> is waiting for admin review.</p>${button("Review listing", listingUrl)}`,
      ),
    };
  },
  listingDecision(title: string, approved: boolean, listingUrl: string, note?: string) {
    return {
      subject: approved
        ? `Your Huntfields listing was approved`
        : `Your Huntfields listing needs changes`,
      text: `${title}: ${approved ? "approved" : "not approved"}\n${note ?? ""}\n${listingUrl}`,
      html: layout(
        approved ? "Listing approved" : "Listing needs changes",
        `<p><strong>${title}</strong> ${approved ? "is now live on Huntfields." : "was not approved yet."}</p>${note ? `<p>${note}</p>` : ""}${button("Open listing", listingUrl)}`,
      ),
    };
  },
  hunterRequest(title: string, requesterName: string, requestUrl: string) {
    return {
      subject: `New access request for ${title}`,
      text: `${requesterName} requested access to ${title}.\n${requestUrl}`,
      html: layout(
        "New hunter request",
        `<p><strong>${requesterName}</strong> requested access to <strong>${title}</strong>.</p>${button("Respond to request", requestUrl)}`,
      ),
    };
  },
  landownerResponse(title: string, approved: boolean, requestUrl: string) {
    return {
      subject: approved
        ? `Your request for ${title} was approved`
        : `Update on your request for ${title}`,
      text: `Your request for ${title} was ${approved ? "approved" : "updated"}.\n${requestUrl}`,
      html: layout(
        approved ? "Request approved" : "Request updated",
        `<p>Your request for <strong>${title}</strong> was ${approved ? "approved" : "updated by the landowner"}.</p>${button("View request", requestUrl)}`,
      ),
    };
  },
  messageReceived(
    title: string,
    senderName: string,
    requestUrl: string,
    hasAttachments: boolean,
  ) {
    return {
      subject: `New message about ${title}`,
      text: `${senderName} sent a new message${hasAttachments ? " with attachments" : ""} about ${title}.\n${requestUrl}`,
      html: layout(
        "New request message",
        `<p><strong>${senderName}</strong> sent a new message${hasAttachments ? " with attachments" : ""} about <strong>${title}</strong>.</p>${button("Open conversation", requestUrl)}`,
      ),
    };
  },
  bookingStatus(title: string, status: string, bookingUrl: string) {
    return {
      subject: `Booking ${status}: ${title}`,
      text: `Booking status for ${title}: ${status}\n${bookingUrl}`,
      html: layout(
        "Booking status update",
        `<p>Your booking for <strong>${title}</strong> is now <strong>${status}</strong>.</p>${button("View booking", bookingUrl)}`,
      ),
    };
  },
  leaseContractReady(title: string, contractUrl: string) {
    return {
      subject: `Lease agreement ready for hunter signature: ${title}`,
      text: `The hunting lease agreement for ${title} is ready for the hunter signature. Payment opens after the hunter signs.\n${contractUrl}`,
      html: layout(
        "Lease agreement ready for hunter signature",
        `<p>The hunting lease agreement for <strong>${title}</strong> is ready for the hunter signature. Payment opens after the hunter signs, and the landowner signs after payment clears.</p>${button("Review and sign", contractUrl)}`,
      ),
    };
  },
  hunterPaymentDue(title: string, contractUrl: string) {
    return {
      subject: `Payment due after signature: ${title}`,
      text: `Your hunter signature for ${title} is saved. Complete checkout so the landowner can countersign.\n${contractUrl}`,
      html: layout(
        "Payment due after signature",
        `<p>Your hunter signature for <strong>${title}</strong> is saved. Complete checkout so the landowner can countersign and activate the agreement.</p>${button("Complete checkout", contractUrl)}`,
      ),
    };
  },
  ownerSignatureReady(title: string, contractUrl: string) {
    return {
      subject: `Owner signature ready: ${title}`,
      text: `The hunter signed and completed checkout for ${title}. Review and countersign to activate the contract.\n${contractUrl}`,
      html: layout(
        "Owner signature ready",
        `<p>The hunter signed and completed checkout for <strong>${title}</strong>. Review and countersign to activate the contract and release the owner payout workflow.</p>${button("Review and sign", contractUrl)}`,
      ),
    };
  },
  leaseContractSigned(title: string, contractUrl: string) {
    return {
      subject: `Lease agreement active: ${title}`,
      text: `The hunting lease agreement for ${title} has been fully signed and is active. Owner payout processing has started.\n${contractUrl}`,
      html: layout(
        "Lease agreement active",
        `<p>The hunting lease agreement for <strong>${title}</strong> has been fully signed and is active. Owner payout processing has started.</p>${button("Open agreement", contractUrl)}`,
      ),
    };
  },
  renewalPaymentDue(
    title: string,
    startsOn: string,
    endsOn: string,
    amountLabel: string,
    contractUrl: string,
  ) {
    return {
      subject: `Renewal payment due: ${title}`,
      text: `Renewal payment is due for ${title} (${startsOn} through ${endsOn}). Amount due: ${amountLabel}.\n${contractUrl}`,
      html: layout(
        "Renewal payment due",
        `<p>The renewal window for <strong>${title}</strong> is open for <strong>${startsOn}</strong> through <strong>${endsOn}</strong>.</p><p>Amount due: <strong>${amountLabel}</strong>. The existing signed agreement stays on file, but the renewed lease period is not active until checkout is complete.</p>${button("Complete renewal payment", contractUrl)}`,
      ),
    };
  },
  ownerRenewalNotice(
    title: string,
    startsOn: string,
    endsOn: string,
    contractUrl: string,
  ) {
    return {
      subject: `Lease renewal window open: ${title}`,
      text: `The renewal window for ${title} is open for ${startsOn} through ${endsOn}. The hunter must complete a new payment for the renewed term; the existing signed agreement remains on file.\n${contractUrl}`,
      html: layout(
        "Lease renewal window open",
        `<p>The renewal window for <strong>${title}</strong> is open for <strong>${startsOn}</strong> through <strong>${endsOn}</strong>.</p><p>The hunter must complete a new payment for the renewed term. The existing signed agreement remains on file.</p>${button("Open agreement", contractUrl)}`,
      ),
    };
  },
  renewalPaymentReceived(
    title: string,
    startsOn: string,
    endsOn: string,
    contractUrl: string,
  ) {
    return {
      subject: `Lease renewed: ${title}`,
      text: `The renewal payment for ${title} has cleared. The lease is renewed for ${startsOn} through ${endsOn}, and owner payout processing has started.\n${contractUrl}`,
      html: layout(
        "Lease renewed",
        `<p>The renewal payment for <strong>${title}</strong> has cleared. The lease is renewed for <strong>${startsOn}</strong> through <strong>${endsOn}</strong>, and owner payout processing has started.</p>${button("Open agreement", contractUrl)}`,
      ),
    };
  },
  leaseExpired(
    title: string,
    endedOn: string,
    contractUrl: string,
  ) {
    return {
      subject: `Lease expired: ${title}`,
      text: `The lease for ${title} expired on ${endedOn}. Renewal payment was not completed before the end of the paid term.\n${contractUrl}`,
      html: layout(
        "Lease expired",
        `<p>The lease for <strong>${title}</strong> expired on <strong>${endedOn}</strong>. Renewal payment was not completed before the end of the paid term.</p>${button("Open agreement", contractUrl)}`,
      ),
    };
  },
  contactForm(name: string, email: string, topic: string, message: string) {
    return {
      subject: `Huntfields contact: ${topic}`,
      text: `${name} <${email}> wrote:\n\n${message}`,
      html: layout(
        "New contact form message",
        `<p><strong>${name}</strong> &lt;${email}&gt; wrote about <strong>${topic}</strong>.</p><p>${message.replaceAll("\n", "<br>")}</p>`,
      ),
    };
  },
  dashboardProblemReport(
    name: string,
    email: string,
    role: "hunter" | "landowner",
    message: string,
    dashboardUrl: string,
  ) {
    const roleLabel = role === "landowner" ? "Landowner" : "Hunter";

    return {
      subject: `Huntfields dashboard problem: ${roleLabel}`,
      text: `${name} <${email}> reported a dashboard problem from the ${roleLabel} workspace.\n\n${message}\n\nDashboard: ${dashboardUrl}`,
      html: layout(
        "New dashboard problem report",
        `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt; reported a problem from the <strong>${roleLabel}</strong> workspace.</p><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>${button("Open dashboard", dashboardUrl)}`,
      ),
    };
  },
};

export function appUrl(path: string) {
  return new URL(path, env.appUrl).toString();
}
